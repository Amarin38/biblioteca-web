import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { transaccion } from "../../config/db.ts";
import { errores } from "../../shared/errors.ts";
import { prestamoRepository } from "../prestamos/prestamo.repository.ts";
import { usuarioRepository } from "../usuarios/usuario.repository.ts";
import type {
  FiltrosUsuario,
  Registro,
  Usuario,
  UsuarioNuevo,
  UsuarioToken,
} from "../../types/index.ts";

// ---------- Configuración ----------
const secreto = (() => {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return new TextEncoder().encode(s);
  console.warn(
    "[auth] JWT_SECRET no está definido (o es muy corto): se usa un secreto aleatorio y las sesiones se pierden al reiniciar.",
  );
  return randomBytes(32);
})();
const DURACION = process.env.JWT_EXPIRA ?? "12h";

// ---------- Contraseñas ----------
const N = 16384;
const R = 8;
const P = 1;

const derivar = (
  password: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
) =>
  new Promise<Buffer>((ok, mal) =>
    scrypt(
      password,
      salt,
      64,
      { N: n, r, p, maxmem: 256 * n * r },
      (e, clave) => (e ? mal(e) : ok(clave)),
    ),
  );

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await derivar(password, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

let relleno: Promise<string> | undefined;
const falso = () => (relleno ??= hashPassword(randomBytes(12).toString("hex")));

async function verificarPassword(password: string, guardado?: string | null) {
  const [formato, n, r, p, salt, hash] = (guardado ?? (await falso())).split(
    "$",
  );
  if (formato !== "scrypt" || !salt || !hash) return false;
  const esperado = Buffer.from(hash, "hex");
  const calculado = await derivar(
    password,
    Buffer.from(salt, "hex"),
    Number(n),
    Number(r),
    Number(p),
  );
  return (
    !!guardado &&
    esperado.length === calculado.length &&
    timingSafeEqual(esperado, calculado)
  );
}

// ---------- Token ----------
const firmar = (u: UsuarioToken) =>
  new SignJWT({ nombre: u.nombre, email: u.email, tipo: u.tipo })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(u.id))
    .setIssuedAt()
    .setExpirationTime(DURACION)
    .sign(secreto);

const respuesta = async (u: UsuarioToken) => ({
  token: await firmar(u),
  usuario: {
    idUsuario: u.id,
    nombre: u.nombre,
    email: u.email,
    tipo: u.tipo,
    admin: u.admin,
  },
});

// ---------- Freno a la fuerza bruta: 8 intentos fallidos por email e IP cada 10 minutos ----------
const intentos = new Map<string, { n: number; hasta: number }>();
const demasiados = (clave: string) =>
  (intentos.get(clave)?.hasta ?? 0) > Date.now() &&
  (intentos.get(clave)?.n ?? 0) >= 8;

function falla(clave: string) {
  const previo = intentos.get(clave);
  const vigente = previo && previo.hasta > Date.now();
  intentos.set(clave, {
    n: (vigente ? previo.n : 0) + 1,
    hasta: vigente ? previo.hasta : Date.now() + 10 * 60_000,
  });
}

export const usuarioService = {
  listar: (filtros: FiltrosUsuario) => usuarioRepository.findAll(filtros),

  obtener(idUsuario: number): Usuario {
    const usuario = usuarioRepository.findByIdUsuario(idUsuario);
    if (!usuario) throw errores.usuario.noExiste(idUsuario);

    return usuario;
  },

  obtenerPorEmail(email: string): Usuario {
    const usuario = usuarioRepository.findByEmail(email);
    if (!usuario) throw errores.usuario.noExistePorEmail(email);

    return usuario;
  },

  crear: transaccion((usuarios: UsuarioNuevo[]) => {
    const creados = [];

    for (const usuario of usuarios) {
      if (usuarioRepository.findByEmail(usuario.email))
        throw errores.usuario.emailRegistrado(usuario.email);

      creados.push(usuarioRepository.insert({ ...usuario }));
    }

    return creados;
  }),

  borrar(id_usuario: number) {
    const usuario = this.obtener(id_usuario);

    if (prestamoRepository.countActiveByUser(id_usuario) > 0)
      throw errores.usuario.conPrestamosActivos(usuario.nombre);

    if (prestamoRepository.countByUser(id_usuario) > 0)
      throw errores.usuario.conPrestamos(usuario.nombre);

    return usuarioRepository.deleteByIdUsuario(id_usuario);
  },

  reemplazarUsuario(id_usuario: number, datos: UsuarioNuevo) {
    this.obtener(id_usuario);

    const otro = usuarioRepository.findByEmail(datos.email);
    if (otro && otro.idUsuario !== id_usuario)
      throw errores.usuario.emailRegistrado(datos.email);

    return usuarioRepository.update(id_usuario, datos);
  },

  // ---------- Autenticación ----------
  async registrar({ nombre, email, password }: Registro) {
    const hash = await hashPassword(password);
    let id: number;
    try {
      id = usuarioRepository.insertConPassword(nombre, email, hash);
    } catch (e) {
      if (String(e).includes("UNIQUE"))
        throw errores.usuario.emailRegistrado(email);
      throw e;
    }
    return respuesta({ id, nombre, email, tipo: "normal", admin: false });
  },

  async login(email: string, password: string, ip?: string) {
    const clave = `${ip}|${email}`;
    if (demasiados(clave)) throw errores.auth.demasiadosIntentos();

    const fila = usuarioRepository.findAuthByEmail(email);
    const ok = await verificarPassword(password, fila?.password_hash);
    if (!fila || !ok) {
      falla(clave);
      throw errores.auth.credenciales();
    }
    intentos.delete(clave);

    return respuesta({
      id: fila.id_usuario,
      nombre: fila.nombre,
      email: fila.email,
      tipo: fila.tipo,
      admin: fila.es_admin === 1,
    });
  },

  async usuarioDeToken(token: string): Promise<UsuarioToken | undefined> {
    try {
      const { payload } = await jwtVerify(token, secreto, {
        algorithms: ["HS256"],
      });
      const id = Number(payload.sub);
      if (!Number.isInteger(id)) return undefined;
      const admin = usuarioRepository.esAdmin(id);
      if (admin === undefined) return undefined; // la cuenta ya no existe
      return {
        id,
        nombre: String(payload.nombre),
        email: String(payload.email),
        tipo: String(payload.tipo),
        admin,
      };
    } catch {
      return undefined;
    }
  },
};
