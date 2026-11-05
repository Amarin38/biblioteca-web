// Pruebas de los endpoints del backend (framework de testing integrado en Node: node:test).
// Se ejecutan contra un servidor en marcha; no necesitan dependencias.
//
//   ADMIN_EMAIL=admin@dominio.com ADMIN_PASSWORD=su-clave npm test
//   (BASE_URL indica la API; por defecto http://localhost:8083/api, la app levantada con Docker)
//
// Alta, modificación y baja de libros y ejemplares, y los reportes, son solo para administradores:
// hace falta una cuenta de administrador (se crea con ./usuarios.sh crear ... y ./usuarios.sh admin <email>).
//
// Cada corrida crea sus propios datos (con un sufijo único) y los elimina al terminar,
// así que se puede repetir sin ensuciar ni depender del contenido de la base.
// Todo lo que se crea registra su propia limpieza (aLimpiar): al final se ejecuta en orden inverso,
// de modo que, aunque una prueba falle a mitad de camino, no quedan datos de la corrida.
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

const BASE = (process.env.BASE_URL ?? "http://localhost:8083/api").replace(
  /\/$/,
  "",
);

// ---------- Utilidades ----------
async function http(metodo, ruta, { body, token, headers = {} } = {}) {
  const res = await fetch(BASE + ruta, {
    method: metodo,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const texto = await res.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }
  const detalle = datos?.error
    ? ` ${JSON.stringify(datos.error).slice(0, 120)}`
    : "";
  return {
    status: res.status,
    body: datos,
    headers: res.headers,
    // Qué se pidió y qué contestó el servidor: va en el mensaje de cualquier comprobación que falle
    resumen: `${metodo} ${ruta} → ${res.status}${detalle}`,
  };
}

// Comprueba el status de una respuesta y la devuelve (para encadenar: const r = esperar(await ..., 201)).
// El reporter ya muestra "esperaba X y recibió Y": el mensaje solo agrega qué se pidió y qué contestó el servidor.
// `desde` es la función cuya llamada se informa como línea del fallo: por defecto esta, es decir, la línea de la
// prueba; los helpers que llaman a esperar se pasan a sí mismos para que se informe la línea de la prueba.
function esperar(r, status, mensaje, desde = esperar) {
  if (r.status !== status) {
    throw new assert.AssertionError({
      message: `${mensaje ? `${mensaje}: ` : ""}${r.resumen}`,
      actual: r.status,
      expected: status,
      stackStartFn: desde,
    });
  }
  return r;
}

// Un DELETE correcto es 204 y no lleva cuerpo
function borrado(r, mensaje) {
  esperar(r, 204, mensaje, borrado);
  if (r.body !== null) {
    throw new assert.AssertionError({
      message: `${r.resumen}: un 204 no lleva cuerpo`,
      actual: r.body,
      expected: null,
      stackStartFn: borrado,
    });
  }
}

const adm = (metodo, ruta, opciones = {}) =>
  http(metodo, ruta, { ...opciones, token: admin.token });
const estadoDe = async (cb) =>
  (await http("GET", `/ejemplares/${cb}`)).body?.estado;
const uno = (b) => (Array.isArray(b) ? b[0] : b); // los alta aceptan uno o varios: se toma el primero
const location = (r) => r.headers.get("location") ?? "";

const corrida =
  Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const digitos = (n) =>
  String(Math.floor(Math.random() * 10 ** n)).padStart(n, "0");
const isbnNuevo = () => `978${digitos(10)}`; // 13 dígitos
const codigoNuevo = () => `${digitos(12)}${digitos(1)}`; // exactamente 13 caracteres
// La fecha de hoy en la zona horaria de la app (la misma que usa el backend)
const hoy = () =>
  new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

const libroDe = (isbn, extra = {}) => ({
  isbn,
  titulo: `Libro de prueba ${corrida}`,
  autor: "Autora de Prueba",
  genero: "ficción",
  fechaLanzamiento: "2001-05-17",
  ...extra,
});

// ---------- Limpieza automática ----------
// Cada recurso que se crea registra cómo borrarlo; al final se ejecutan al revés
// (primero los préstamos, después los ejemplares, los libros y por último las cuentas).
const limpieza = [];
const aLimpiar = (fn) => limpieza.push(fn);
const limpiarEjemplar = async (cb) => {
  await adm("PATCH", `/ejemplares/${cb}`, { body: { estado: "baja" } });
  await adm("DELETE", `/ejemplares/${cb}`);
};

// ---------- Datos compartidos entre las pruebas (se crean en orden) ----------
const admin = {
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
};
const ana = { email: `ana.${corrida}@example.com`, password: "clave-prueba-1" };
const beto = {
  email: `beto.${corrida}@example.com`,
  password: "clave-prueba-2",
};
const isbn = isbnNuevo();
const isbn2 = isbnNuevo();
const ej1 = codigoNuevo();
const ej2 = codigoNuevo();
let prestamo1;
let prestamo2;
let prestamo3;

// Crea una cuenta nueva (siempre de tipo normal) y deja registrada su baja
async function crearUsuario(prefijo) {
  const u = {
    nombre: `${prefijo} Prueba`,
    email: `${prefijo}.${corrida}@example.com`,
    password: "clave-prueba-9",
  };
  const r = esperar(
    await http("POST", "/auth/registro", { body: u }),
    201,
    undefined,
    crearUsuario,
  );
  u.id = r.body.usuario.idUsuario;
  u.token = r.body.token;
  u.respuesta = r;
  aLimpiar(() => http("DELETE", `/usuarios/${u.id}`, { token: u.token }));
  return u;
}

// Registra un préstamo a nombre de `u` y deja registrada su devolución y baja
async function prestarComo(u, codigoBarras) {
  const r = esperar(
    await http("POST", "/prestamos", {
      token: u.token,
      body: [{ idUsuario: u.id, idEjemplar: codigoBarras }],
    }),
    201,
    undefined,
    prestarComo,
  );
  const p = uno(r.body);
  aLimpiar(async () => {
    await http("POST", `/prestamos/${p.idPrestamo}/devolucion`, {
      token: u.token,
    });
    await http("DELETE", `/prestamos/${p.idPrestamo}`, { token: u.token });
  });
  return { p, respuesta: r };
}

before(async () => {
  if (!admin.email || !admin.password) {
    throw new Error(
      "Definí ADMIN_EMAIL y ADMIN_PASSWORD con una cuenta de administrador (se crea con ./usuarios.sh crear ... y ./usuarios.sh admin <email>).",
    );
  }
  try {
    esperar(await http("GET", "/libros?limit=1"), 200);
  } catch (e) {
    throw new Error(
      `No se pudo consultar ${BASE}/libros (${e.message}). ¿Está corriendo el backend? Ajustá BASE_URL.`,
    );
  }
  const r = esperar(
    await http("POST", "/auth/login", {
      body: { email: admin.email, password: admin.password },
    }),
    200,
    "no se pudo ingresar con la cuenta de administrador",
  );
  assert.equal(
    r.body.usuario.admin,
    true,
    `${admin.email} no es administrador (./usuarios.sh admin ${admin.email})`,
  );
  admin.token = r.body.token;
});

after(async () => {
  for (const fn of limpieza.reverse()) await fn().catch(() => {});
});

// =====================================================================
describe("Autenticación", () => {
  it("POST /auth/registro crea la cuenta y devuelve el token (201)", async () => {
    const r = esperar(
      await http("POST", "/auth/registro", {
        body: {
          nombre: "Ana Prueba",
          email: ana.email,
          password: ana.password,
        },
      }),
      201,
    );
    assert.match(r.body.token, /^[\w-]+\.[\w-]+\.[\w-]+$/);
    assert.equal(r.body.usuario.email, ana.email);
    assert.equal(r.body.usuario.tipo, "normal");
    assert.equal(
      r.body.usuario.admin,
      false,
      "una cuenta nueva no es administrador",
    );
    assert.ok(Number.isInteger(r.body.usuario.idUsuario));
    assert.equal(
      JSON.stringify(r.body).includes(ana.password),
      false,
      "la respuesta no debe contener la contraseña",
    );
    ana.token = r.body.token;
    ana.id = r.body.usuario.idUsuario;
    aLimpiar(() => http("DELETE", `/usuarios/${ana.id}`, { token: ana.token }));
  });

  it("POST /auth/registro con un email repetido (sin distinguir mayúsculas) da 409", async () => {
    esperar(
      await http("POST", "/auth/registro", {
        body: {
          nombre: "Otra",
          email: ana.email.toUpperCase(),
          password: ana.password,
        },
      }),
      409,
    );
  });

  it("POST /auth/registro con datos inválidos da 400 (contraseña corta, tipo o admin pedidos a mano)", async () => {
    const base = {
      nombre: "X",
      email: `x.${corrida}@example.com`,
      password: "clave-larga-1",
    };
    const casos = [
      [{ ...base, password: "corta" }, "contraseña corta"],
      [{ ...base, tipo: "docente" }, "no se puede elegir el tipo"],
      [{ ...base, admin: true }, "no se puede pedir ser administrador"],
    ];
    for (const [body, motivo] of casos)
      esperar(await http("POST", "/auth/registro", { body }), 400, motivo);
  });

  it("POST /auth/registro crea un segundo usuario", async () => {
    const r = esperar(
      await http("POST", "/auth/registro", {
        body: {
          nombre: "Beto Prueba",
          email: beto.email,
          password: beto.password,
        },
      }),
      201,
    );
    beto.token = r.body.token;
    beto.id = r.body.usuario.idUsuario;
    aLimpiar(() =>
      http("DELETE", `/usuarios/${beto.id}`, { token: beto.token }),
    );
  });

  it("POST /auth/login con las credenciales correctas devuelve el token (200)", async () => {
    const r = esperar(
      await http("POST", "/auth/login", {
        body: { email: ana.email.toUpperCase(), password: ana.password },
      }),
      200,
    );
    assert.equal(r.body.usuario.idUsuario, ana.id);
    assert.ok(r.body.token);
  });

  it("POST /auth/login con una contraseña incorrecta o un email inexistente da el mismo 401", async () => {
    const mala = esperar(
      await http("POST", "/auth/login", {
        body: { email: ana.email, password: "incorrecta-1" },
      }),
      401,
    );
    const inexistente = esperar(
      await http("POST", "/auth/login", {
        body: {
          email: `nadie.${corrida}@example.com`,
          password: "incorrecta-1",
        },
      }),
      401,
    );
    assert.deepEqual(
      mala.body,
      inexistente.body,
      "no revela si la cuenta existe",
    );
  });

  it("POST /auth/login sin contraseña da 400", async () => {
    esperar(
      await http("POST", "/auth/login", { body: { email: ana.email } }),
      400,
    );
  });

  it("las rutas protegidas piden un token válido (401)", async () => {
    esperar(await http("GET", "/prestamos"), 401);
    esperar(await http("GET", "/prestamos", { token: "no.es.untoken" }), 401);
    esperar(await http("GET", `/usuarios/${ana.id}`), 401);
  });

  it("tras 8 intentos fallidos el login se bloquea (429) solo para ese email", async () => {
    const victima = {
      email: `bloqueada.${corrida}@example.com`,
      password: "incorrecta-1",
    };
    for (let i = 1; i <= 8; i++)
      esperar(
        await http("POST", "/auth/login", { body: victima }),
        401,
        `intento ${i}`,
      );
    esperar(
      await http("POST", "/auth/login", { body: victima }),
      429,
      "intento 9",
    );
    // el freno es por email e IP: las demás cuentas no se ven afectadas
    esperar(
      await http("POST", "/auth/login", {
        body: { email: ana.email, password: ana.password },
      }),
      200,
    );
  });
});

// =====================================================================
describe("Permisos de administrador", () => {
  it("el ingreso del administrador lo identifica como tal", async () => {
    const a = esperar(
      await http("POST", "/auth/login", {
        body: { email: admin.email, password: admin.password },
      }),
      200,
    );
    assert.equal(a.body.usuario.admin, true);
    const n = await http("POST", "/auth/login", {
      body: { email: ana.email, password: ana.password },
    });
    assert.equal(n.body.usuario.admin, false);
  });

  const operaciones = () => [
    ["POST", "/libros", [libroDe(isbnNuevo())]],
    ["PATCH", `/libros/${isbnNuevo()}`, { titulo: "X" }],
    ["DELETE", `/libros/${isbnNuevo()}`],
    [
      "POST",
      `/libros/${isbnNuevo()}/ejemplares`,
      [{ codigoBarras: codigoNuevo() }],
    ],
    ["PATCH", `/ejemplares/${codigoNuevo()}`, { estado: "baja" }],
    ["DELETE", `/ejemplares/${codigoNuevo()}`],
  ];

  it("dar de alta, modificar o dar de baja libros y ejemplares pide sesión (401)", async () => {
    for (const [metodo, ruta, body] of operaciones())
      esperar(await http(metodo, ruta, { body }), 401, `${metodo} ${ruta}`);
  });

  it("un usuario que no es administrador no puede (403)", async () => {
    for (const [metodo, ruta, body] of operaciones())
      esperar(
        await http(metodo, ruta, { body, token: ana.token }),
        403,
        `${metodo} ${ruta}`,
      );
  });

  it("consultar el catálogo sigue siendo público (200)", async () => {
    esperar(await http("GET", "/libros?limit=1"), 200);
    esperar(await http("GET", "/ejemplares?limit=1"), 200);
  });

  it("GET /reportes/resumen pide sesión (401) y ser administrador (403)", async () => {
    esperar(await http("GET", "/reportes/resumen"), 401);
    esperar(await http("GET", "/reportes/resumen", { token: ana.token }), 403);
    esperar(await adm("GET", "/reportes/resumen"), 200);
  });
});

// =====================================================================
describe("Libros: alta, consulta, modificación y baja", () => {
  it("POST /libros crea un libro (201)", async () => {
    const r = esperar(
      await adm("POST", "/libros", { body: [libroDe(isbn)] }),
      201,
    );
    aLimpiar(() => adm("DELETE", `/libros/${isbn}`));
    const l = uno(r.body);
    assert.equal(l.isbn, isbn);
    assert.equal(l.genero, "ficción");
  });

  it("POST /libros acepta un objeto suelto (201)", async () => {
    const r = esperar(
      await adm("POST", "/libros", {
        body: libroDe(isbn2, { titulo: `Segundo libro ${corrida}` }),
      }),
      201,
    );
    aLimpiar(() => adm("DELETE", `/libros/${isbn2}`));
    assert.equal(uno(r.body).isbn, isbn2);
  });

  it("POST /libros con un isbn repetido da 409", async () => {
    esperar(await adm("POST", "/libros", { body: [libroDe(isbn)] }), 409);
  });

  it("POST /libros con datos inválidos da 400 (sin fecha, género inexistente, campo desconocido, fecha futura)", async () => {
    const { fechaLanzamiento, ...sinFecha } = libroDe(isbnNuevo());
    const casos = [
      [sinFecha, "sin fecha"],
      [libroDe(isbnNuevo(), { genero: "inventado" }), "género inexistente"],
      [libroDe(isbnNuevo(), { otro: 1 }), "campo desconocido"],
      [
        libroDe(isbnNuevo(), { fechaLanzamiento: "2999-01-01" }),
        "fecha futura",
      ],
    ];
    for (const [libro, motivo] of casos)
      esperar(await adm("POST", "/libros", { body: [libro] }), 400, motivo);
  });

  it("GET /libros lista, pagina y filtra por título", async () => {
    const todos = esperar(await http("GET", "/libros?limit=200"), 200);
    assert.ok(Array.isArray(todos.body));
    const pagina = esperar(await http("GET", "/libros?limit=1"), 200);
    assert.equal(pagina.body.length, 1, "limit=1 devuelve un solo libro");
    const siguiente = esperar(
      await http("GET", "/libros?limit=1&offset=1"),
      200,
    );
    assert.notEqual(
      siguiente.body[0]?.isbn,
      pagina.body[0]?.isbn,
      "offset=1 devuelve otro libro",
    );
    const filtrados = esperar(
      await http(
        "GET",
        `/libros?titulo=${encodeURIComponent(`Libro de prueba ${corrida}`)}`,
      ),
      200,
    );
    assert.deepEqual(
      filtrados.body.map((l) => l.isbn),
      [isbn],
    );
  });

  it("GET /libros con una query inválida da 400", async () => {
    esperar(await http("GET", "/libros?genero=inventado"), 400);
    esperar(await http("GET", "/libros?limit=0"), 400);
  });

  it("GET /libros/{isbn} devuelve el detalle (200) o 404 si no existe", async () => {
    const r = esperar(await http("GET", `/libros/${isbn}`), 200);
    assert.equal(r.body.autor, "Autora de Prueba");
    assert.equal(r.body.fechaLanzamiento, "2001-05-17");
    esperar(await http("GET", `/libros/${isbnNuevo()}`), 404);
  });

  it("PATCH /libros/{isbn} modifica el título y la sinopsis (200)", async () => {
    const t = esperar(
      await adm("PATCH", `/libros/${isbn}`, {
        body: { titulo: `Título corregido ${corrida}` },
      }),
      200,
    );
    assert.equal(t.body.titulo, `Título corregido ${corrida}`);
    const s = esperar(
      await adm("PATCH", `/libros/${isbn}`, {
        body: { sinopsis: "Una sinopsis de prueba." },
      }),
      200,
    );
    assert.equal(s.body.sinopsis, "Una sinopsis de prueba.");
    assert.equal(
      s.body.titulo,
      `Título corregido ${corrida}`,
      "modificar la sinopsis no debe cambiar el título",
    );
  });

  it("PATCH /libros/{isbn} da 400 con un body inválido y 404 si el libro no existe", async () => {
    esperar(
      await adm("PATCH", `/libros/${isbn}`, { body: {} }),
      400,
      "body vacío",
    );
    esperar(
      await adm("PATCH", `/libros/${isbn}`, { body: { autor: "Otro" } }),
      400,
      "campo no modificable",
    );
    esperar(
      await adm("PATCH", `/libros/${isbnNuevo()}`, { body: { titulo: "X" } }),
      404,
    );
  });

  it("POST /libros/{isbn}/ejemplares crea los ejemplares (201)", async () => {
    esperar(
      await adm("POST", `/libros/${isbn}/ejemplares`, {
        body: [{ codigoBarras: ej1 }, { codigoBarras: ej2 }],
      }),
      201,
    );
    aLimpiar(() => limpiarEjemplar(ej1));
    aLimpiar(() => limpiarEjemplar(ej2));
    const lista = esperar(await http("GET", `/libros/${isbn}/ejemplares`), 200);
    assert.deepEqual(
      lista.body.map((e) => e.codigoBarras).sort(),
      [ej1, ej2].sort(),
    );
  });

  it("POST /libros/{isbn}/ejemplares da 409 (código repetido), 400 (largo inválido) y 404 (libro inexistente)", async () => {
    esperar(
      await adm("POST", `/libros/${isbn}/ejemplares`, {
        body: [{ codigoBarras: ej1 }],
      }),
      409,
    );
    esperar(
      await adm("POST", `/libros/${isbn}/ejemplares`, {
        body: [{ codigoBarras: "123" }],
      }),
      400,
    );
    esperar(
      await adm("POST", `/libros/${isbnNuevo()}/ejemplares`, {
        body: [{ codigoBarras: codigoNuevo() }],
      }),
      404,
    );
  });

  it("GET /libros/{isbn}/ejemplares da 404 si el libro no existe", async () => {
    esperar(await http("GET", `/libros/${isbnNuevo()}/ejemplares`), 404);
  });
});

// =====================================================================
describe("Ejemplares", () => {
  it("GET /ejemplares filtra por estado (200) y rechaza un estado inválido (400)", async () => {
    const r = esperar(
      await http("GET", "/ejemplares?estado=prestado&limit=200"),
      200,
    );
    assert.ok(r.body.every((e) => e.estado === "prestado"));
    esperar(await http("GET", "/ejemplares?estado=roto"), 400);
  });

  it("GET /ejemplares/{codigoBarras} devuelve el detalle (200) o 404", async () => {
    const r = esperar(await http("GET", `/ejemplares/${ej1}`), 200);
    assert.equal(r.body.isbn, isbn);
    esperar(await http("GET", `/ejemplares/${codigoNuevo()}`), 404);
  });

  it("PATCH /ejemplares/{codigoBarras} cambia el estado (200)", async () => {
    for (const cb of [ej1, ej2]) {
      const r = esperar(
        await adm("PATCH", `/ejemplares/${cb}`, {
          body: { estado: "disponible" },
        }),
        200,
      );
      assert.equal(r.body.estado, "disponible");
      assert.equal(await estadoDe(cb), "disponible");
    }
  });

  it("PATCH /ejemplares/{codigoBarras} da 400 con un estado inválido y 404 si no existe", async () => {
    esperar(
      await adm("PATCH", `/ejemplares/${ej1}`, { body: { estado: "roto" } }),
      400,
    );
    esperar(
      await adm("PATCH", `/ejemplares/${codigoNuevo()}`, {
        body: { estado: "baja" },
      }),
      404,
    );
  });
});

// =====================================================================
describe("Préstamos", () => {
  it('POST /prestamos registra el préstamo y el ejemplar pasa a "prestado" (201)', async () => {
    const { p } = await prestarComo(ana, ej1);
    assert.equal(p.idUsuario, ana.id);
    assert.equal(p.idEjemplar, ej1);
    assert.equal(p.estado, "activo");
    assert.match(p.fechaVencimiento, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(p.fechaVencimiento > hoy(), "la fecha límite es posterior a hoy");
    prestamo1 = p.idPrestamo;
    assert.equal(await estadoDe(ej1), "prestado");
  });

  it("POST /prestamos da 409 si el ejemplar no está disponible", async () => {
    esperar(
      await http("POST", "/prestamos", {
        token: beto.token,
        body: [{ idUsuario: beto.id, idEjemplar: ej1 }],
      }),
      409,
    );
  });

  it("POST /prestamos da 404 si el ejemplar no existe y 400 si el body es inválido", async () => {
    esperar(
      await http("POST", "/prestamos", {
        token: ana.token,
        body: [{ idUsuario: ana.id, idEjemplar: codigoNuevo() }],
      }),
      404,
    );
    esperar(
      await http("POST", "/prestamos", {
        token: ana.token,
        body: [{ idUsuario: ana.id }],
      }),
      400,
    );
  });

  it("POST /prestamos a nombre de otro usuario da 403", async () => {
    esperar(
      await http("POST", "/prestamos", {
        token: ana.token,
        body: [{ idUsuario: beto.id, idEjemplar: ej2 }],
      }),
      403,
    );
  });

  it("GET /prestamos devuelve solo los préstamos del usuario que consulta", async () => {
    const a = esperar(
      await http("GET", "/prestamos?limit=200", { token: ana.token }),
      200,
    );
    assert.ok(
      a.body.length >= 1 && a.body.every((p) => p.idUsuario === ana.id),
    );
    assert.ok(a.body.some((p) => p.idPrestamo === prestamo1));
    const b = esperar(
      await http("GET", "/prestamos?limit=200", { token: beto.token }),
      200,
    );
    assert.ok(b.body.every((p) => p.idUsuario === beto.id));
  });

  it("GET /prestamos filtra por estado (200) y rechaza uno inválido (400)", async () => {
    const r = esperar(
      await http("GET", "/prestamos?estado=activo&limit=200", {
        token: ana.token,
      }),
      200,
    );
    assert.ok(r.body.every((p) => p.estado === "activo"));
    esperar(
      await http("GET", "/prestamos?estado=roto", { token: ana.token }),
      400,
    );
  });

  it("GET /prestamos/{id} devuelve el detalle (200); el préstamo de otro usuario da 403", async () => {
    const r = esperar(
      await http("GET", `/prestamos/${prestamo1}`, { token: ana.token }),
      200,
    );
    assert.equal(r.body.idPrestamo, prestamo1);
    esperar(
      await http("GET", `/prestamos/${prestamo1}`, { token: beto.token }),
      403,
    );
  });

  it("GET /prestamos/{id}/multa calcula la multa: un préstamo al día no debe nada", async () => {
    const r = esperar(
      await http("GET", `/prestamos/${prestamo1}/multa`, { token: ana.token }),
      200,
    );
    assert.deepEqual(Object.keys(r.body).sort(), [
      "diasAtraso",
      "monto",
      "pagado",
      "saldo",
    ]);
    assert.equal(r.body.diasAtraso, 0);
    assert.equal(r.body.saldo, 0);
  });

  it("GET /prestamos/{id}/multa/pagos lista los pagos (vacío) y registrar un pago sin multa pendiente da 409", async () => {
    const lista = esperar(
      await http("GET", `/prestamos/${prestamo1}/multa/pagos`, {
        token: ana.token,
      }),
      200,
    );
    assert.deepEqual(lista.body, []);
    esperar(
      await http("POST", `/prestamos/${prestamo1}/multa/pagos`, {
        token: ana.token,
        body: { monto: 10 },
      }),
      409,
    );
  });

  it("GET de multa o pagos de un préstamo inexistente da 404", async () => {
    for (const ruta of [
      "/prestamos/99999999/multa",
      "/prestamos/99999999/multa/pagos",
      "/prestamos/99999999",
    ])
      esperar(await http("GET", ruta, { token: ana.token }), 404, ruta);
  });

  it("GET /libros/{isbn}/pdf pide sesión (401) y un préstamo vigente del libro (403)", async () => {
    esperar(await http("GET", `/libros/${isbn}/pdf`), 401);
    esperar(
      await http("GET", `/libros/${isbn}/pdf`, { token: beto.token }),
      403,
    );
    // Ana sí tiene el libro prestado: el acceso está permitido, pero este libro de prueba no tiene un PDF cargado
    esperar(
      await http("GET", `/libros/${isbn}/pdf`, { token: ana.token }),
      404,
      "libro sin PDF",
    );
    esperar(
      await http("GET", `/libros/${isbnNuevo()}/pdf`, { token: ana.token }),
      404,
      "libro inexistente",
    );
  });

  it("GET /ejemplares/{codigoBarras}/pdf pide sesión (401) y un préstamo vigente del ejemplar (403)", async () => {
    esperar(await http("GET", `/ejemplares/${ej1}/pdf`), 401);
    esperar(
      await http("GET", `/ejemplares/${ej1}/pdf`, { token: beto.token }),
      403,
    );
    esperar(
      await http("GET", `/ejemplares/${ej1}/pdf`, { token: ana.token }),
      404,
      "ejemplar sin PDF",
    );
    esperar(
      await http("GET", `/ejemplares/${codigoNuevo()}/pdf`, {
        token: ana.token,
      }),
      404,
      "ejemplar inexistente",
    );
  });

  it("POST /prestamos/{id}/renovaciones extiende la fecha límite (201) hasta el máximo de renovaciones (409)", async () => {
    const antes = (
      await http("GET", `/prestamos/${prestamo1}`, { token: ana.token })
    ).body;
    const r = esperar(
      await http("POST", `/prestamos/${prestamo1}/renovaciones`, {
        token: ana.token,
      }),
      201,
    );
    assert.ok(
      r.body.fechaVencimiento > antes.fechaVencimiento,
      "la fecha límite avanza",
    );
    assert.equal(r.body.renovaciones, antes.renovaciones + 1);
    let ultimo = r.status;
    for (let i = 0; i < 10 && ultimo === 201; i++)
      ultimo = (
        await http("POST", `/prestamos/${prestamo1}/renovaciones`, {
          token: ana.token,
        })
      ).status;
    assert.equal(
      ultimo,
      409,
      "al llegar al máximo de renovaciones responde 409",
    );
  });

  it("PATCH /prestamos/{id} cambia el estado (200) y rechaza uno inválido (400)", async () => {
    const { p } = await prestarComo(ana, ej2);
    prestamo2 = p.idPrestamo;
    esperar(
      await http("PATCH", `/prestamos/${prestamo2}`, {
        token: ana.token,
        body: { estado: "activo" },
      }),
      200,
    );
    esperar(
      await http("PATCH", `/prestamos/${prestamo2}`, {
        token: ana.token,
        body: { estado: "roto" },
      }),
      400,
    );
    esperar(
      await http("PATCH", `/prestamos/${prestamo2}`, {
        token: beto.token,
        body: { estado: "activo" },
      }),
      403,
    );
  });

  it("DELETE /prestamos/{id} da 409 mientras el préstamo sigue activo", async () => {
    esperar(
      await http("DELETE", `/prestamos/${prestamo2}`, { token: ana.token }),
      409,
    );
  });

  it("POST /prestamos/{id}/devolucion finaliza el préstamo y libera el ejemplar (200)", async () => {
    const r = esperar(
      await http("POST", `/prestamos/${prestamo1}/devolucion`, {
        token: ana.token,
      }),
      200,
    );
    assert.equal(r.body.estado, "finalizado");
    assert.equal(await estadoDe(ej1), "disponible");
  });

  it("un préstamo finalizado no se devuelve ni se renueva de nuevo (409); el de otro usuario da 403 y uno inexistente 404", async () => {
    esperar(
      await http("POST", `/prestamos/${prestamo1}/devolucion`, {
        token: ana.token,
      }),
      409,
    );
    esperar(
      await http("POST", `/prestamos/${prestamo1}/renovaciones`, {
        token: ana.token,
      }),
      409,
    );
    esperar(
      await http("POST", `/prestamos/${prestamo2}/devolucion`, {
        token: beto.token,
      }),
      403,
    );
    esperar(
      await http("POST", "/prestamos/99999999/devolucion", {
        token: ana.token,
      }),
      404,
    );
  });

  it("DELETE /ejemplares/{codigoBarras} da 409 mientras tiene un préstamo activo", async () => {
    esperar(await adm("DELETE", `/ejemplares/${ej2}`), 409);
  });
});

// =====================================================================
describe("Usuarios", () => {
  it("GET /usuarios/{id} devuelve el propio usuario (200); el de otro y el listado dan 403", async () => {
    const r = esperar(
      await http("GET", `/usuarios/${ana.id}`, { token: ana.token }),
      200,
    );
    assert.equal(r.body.email, ana.email);
    esperar(
      await http("GET", `/usuarios/${beto.id}`, { token: ana.token }),
      403,
    );
    esperar(await http("GET", "/usuarios", { token: ana.token }), 403);
  });

  it("GET /usuarios/{id}/prestamos lista los préstamos del usuario (200)", async () => {
    const r = esperar(
      await http("GET", `/usuarios/${ana.id}/prestamos`, { token: ana.token }),
      200,
    );
    assert.ok(r.body.some((p) => p.idPrestamo === prestamo1));
  });

  it("PUT /usuarios/{id} modifica el usuario (200) y da 400 con un body inválido", async () => {
    const r = esperar(
      await http("PUT", `/usuarios/${ana.id}`, {
        token: ana.token,
        body: { nombre: "Ana Modificada", email: ana.email, tipo: "normal" },
      }),
      200,
    );
    assert.equal(r.body.nombre, "Ana Modificada");
    esperar(
      await http("PUT", `/usuarios/${ana.id}`, {
        token: ana.token,
        body: { nombre: "Ana", email: "no-es-un-email", tipo: "normal" },
      }),
      400,
      "email inválido",
    );
    esperar(
      await http("PUT", `/usuarios/${ana.id}`, {
        token: ana.token,
        body: { nombre: "Ana", email: ana.email, tipo: "rey" },
      }),
      400,
      "tipo inexistente",
    );
  });

  it("PUT /usuarios/{id} con el email de otro usuario da 409", async () => {
    esperar(
      await http("PUT", `/usuarios/${ana.id}`, {
        token: ana.token,
        body: { nombre: "Ana", email: beto.email, tipo: "normal" },
      }),
      409,
    );
  });

  it("PUT /usuarios/{id} con un email nuevo lo cambia (200)", async () => {
    const dana = await crearUsuario("dana");
    const nuevo = `dana.nueva.${corrida}@example.com`;
    const r = esperar(
      await http("PUT", `/usuarios/${dana.id}`, {
        token: dana.token,
        body: { nombre: "Dana", email: nuevo, tipo: "normal" },
      }),
      200,
    );
    assert.equal(r.body.email, nuevo);
    esperar(
      await http("POST", "/auth/login", {
        body: { email: nuevo, password: dana.password },
      }),
      200,
    );
  });

  it("PUT /usuarios/{id} no permite convertirse en administrador", async () => {
    const r = await http("PUT", `/usuarios/${beto.id}`, {
      token: beto.token,
      body: {
        nombre: "Beto Prueba",
        email: beto.email,
        tipo: "normal",
        admin: true,
        esAdmin: true,
      },
    });
    assert.ok(
      [200, 400].includes(r.status),
      `se rechaza o se ignora: ${r.resumen}`,
    );
    const sesion = esperar(
      await http("POST", "/auth/login", {
        body: { email: beto.email, password: beto.password },
      }),
      200,
    );
    assert.equal(sesion.body.usuario.admin, false);
    esperar(await http("GET", "/reportes/resumen", { token: beto.token }), 403);
  });

  it("DELETE /usuarios/{id} da 409 si el usuario tiene préstamos activos", async () => {
    esperar(
      await http("DELETE", `/usuarios/${ana.id}`, { token: ana.token }),
      409,
    );
  });

  it("DELETE /usuarios/{id} elimina una cuenta sin préstamos (204) y su sesión deja de valer (401)", async () => {
    const carla = await crearUsuario("carla");
    borrado(
      await http("DELETE", `/usuarios/${carla.id}`, { token: carla.token }),
    );
    esperar(
      await http("GET", "/prestamos", { token: carla.token }),
      401,
      "token de una cuenta borrada",
    );
    esperar(
      await http("POST", "/auth/login", {
        body: { email: carla.email, password: carla.password },
      }),
      401,
      "login de una cuenta borrada",
    );
  });
});

// =====================================================================
describe("Convenciones REST", () => {
  it("los errores devuelven JSON con la forma { error: string }", async () => {
    const casos = [
      [await http("GET", `/libros/${isbnNuevo()}`), 404],
      [await http("GET", "/libros?limit=0"), 400],
      [await http("GET", "/prestamos"), 401],
      [
        await http("POST", "/libros", {
          token: ana.token,
          body: [libroDe(isbnNuevo())],
        }),
        403,
      ],
      [await adm("POST", "/libros", { body: [libroDe(isbn)] }), 409],
      [await http("GET", "/ruta-que-no-existe"), 404],
    ];
    for (const [r, status] of casos) {
      esperar(r, status);
      assert.equal(typeof r.body?.error, "string", r.resumen);
      assert.ok(r.body.error.length > 0, r.resumen);
      assert.match(
        r.headers.get("content-type") ?? "",
        /application\/json/,
        r.resumen,
      );
    }
  });

  it("los alta devuelven 201 con el header Location del recurso creado", async () => {
    const eva = await crearUsuario("eva");
    assert.match(
      location(eva.respuesta),
      new RegExp(`/usuarios/${eva.id}$`),
      eva.respuesta.resumen,
    );

    const isbnL = isbnNuevo();
    const cbL = codigoNuevo();
    const libro = esperar(
      await adm("POST", "/libros", { body: [libroDe(isbnL)] }),
      201,
    );
    aLimpiar(() => adm("DELETE", `/libros/${isbnL}`));
    assert.match(
      location(libro),
      new RegExp(`/libros/${isbnL}$`),
      libro.resumen,
    );

    const ejemplar = esperar(
      await adm("POST", `/libros/${isbnL}/ejemplares`, {
        body: [{ codigoBarras: cbL }],
      }),
      201,
    );
    aLimpiar(() => limpiarEjemplar(cbL));
    assert.match(
      location(ejemplar),
      new RegExp(`/ejemplares/${cbL}$`),
      ejemplar.resumen,
    );

    esperar(
      await adm("PATCH", `/ejemplares/${cbL}`, {
        body: { estado: "disponible" },
      }),
      200,
    );
    const { p, respuesta } = await prestarComo(eva, cbL);
    assert.match(
      location(respuesta),
      new RegExp(`/prestamos/${p.idPrestamo}$`),
      respuesta.resumen,
    );

    // se deja todo como estaba, para no alterar el resto de las pruebas
    esperar(
      await http("POST", `/prestamos/${p.idPrestamo}/devolucion`, {
        token: eva.token,
      }),
      200,
    );
    borrado(
      await http("DELETE", `/prestamos/${p.idPrestamo}`, { token: eva.token }),
    );
  });
});

// =====================================================================
describe("Reportes", () => {
  let antes;

  it("GET /reportes/resumen devuelve los totales y los rankings (200)", async () => {
    const r = esperar(await adm("GET", "/reportes/resumen"), 200);
    antes = r.body;
    assert.match(antes.generadoEn, /^\d{4}-\d{2}-\d{2}$/);
    const e = antes.ejemplares;
    assert.equal(
      e.total,
      e.disponible + e.prestado + e.baja,
      "el total de ejemplares es la suma de sus estados",
    );
    const p = antes.prestamos;
    assert.equal(
      p.total,
      p.activo + p.vencido + p.finalizado,
      "el total de préstamos es la suma de sus estados",
    );
    assert.ok(antes.libros >= 2 && antes.usuarios >= 2);
    assert.ok(antes.masPrestados.length <= 10);
    const cantidades = antes.masPrestados.map((l) => l.prestamos);
    assert.deepEqual(
      cantidades,
      [...cantidades].sort((a, b) => b - a),
      "los libros más prestados vienen de mayor a menor",
    );
    assert.ok(
      antes.porGenero.some((g) => g.genero === "ficción" && g.prestamos >= 2),
    );
    assert.equal(antes.porMes.length, 6);
    assert.deepEqual(
      antes.porMes.map((m) => m.mes),
      antes.porMes.map((m) => m.mes).sort(),
      "los meses van en orden",
    );
    assert.ok(
      antes.porMes.at(-1).prestamos >= 2,
      "el mes actual cuenta los préstamos de esta corrida",
    );
    assert.equal(typeof antes.multasCobradas, "number");
  });

  it("un préstamo nuevo se refleja en el reporte, y su devolución también", async () => {
    const { p } = await prestarComo(beto, ej1);
    prestamo3 = p.idPrestamo;
    const durante = (await adm("GET", "/reportes/resumen")).body;
    assert.equal(durante.prestamos.activo, antes.prestamos.activo + 1);
    assert.equal(durante.prestamos.total, antes.prestamos.total + 1);
    assert.equal(durante.ejemplares.prestado, antes.ejemplares.prestado + 1);
    assert.equal(
      durante.ejemplares.disponible,
      antes.ejemplares.disponible - 1,
    );

    esperar(
      await http("POST", `/prestamos/${prestamo3}/devolucion`, {
        token: beto.token,
      }),
      200,
    );
    const despues = (await adm("GET", "/reportes/resumen")).body;
    assert.equal(despues.prestamos.activo, antes.prestamos.activo);
    assert.equal(despues.prestamos.finalizado, antes.prestamos.finalizado + 1);
    assert.equal(despues.ejemplares.disponible, antes.ejemplares.disponible);
  });
});

// =====================================================================
describe("Bajas (se eliminan los datos de la corrida)", () => {
  it("DELETE /prestamos/{id} elimina los préstamos finalizados (204) y después da 404", async () => {
    esperar(
      await http("POST", `/prestamos/${prestamo2}/devolucion`, {
        token: ana.token,
      }),
      200,
    );
    for (const [id, token] of [
      [prestamo1, ana.token],
      [prestamo2, ana.token],
      [prestamo3, beto.token],
    ])
      borrado(
        await http("DELETE", `/prestamos/${id}`, { token }),
        `préstamo ${id}`,
      );
    esperar(
      await http("DELETE", `/prestamos/${prestamo1}`, { token: ana.token }),
      404,
    );
  });

  it('DELETE /ejemplares/{codigoBarras} con historial de préstamos: solo en estado "baja", y se lleva ese historial', async () => {
    const ej3 = codigoNuevo();
    esperar(
      await adm("POST", `/libros/${isbn}/ejemplares`, {
        body: [{ codigoBarras: ej3 }],
      }),
      201,
    );
    aLimpiar(() => limpiarEjemplar(ej3));
    esperar(
      await adm("PATCH", `/ejemplares/${ej3}`, {
        body: { estado: "disponible" },
      }),
      200,
    );
    const { p } = await prestarComo(ana, ej3);
    esperar(
      await adm("DELETE", `/ejemplares/${ej3}`),
      409,
      "con un préstamo activo",
    );
    esperar(
      await http("POST", `/prestamos/${p.idPrestamo}/devolucion`, {
        token: ana.token,
      }),
      200,
    );
    esperar(
      await adm("DELETE", `/ejemplares/${ej3}`),
      409,
      "devuelto, pero sin estar en baja",
    );
    esperar(
      await adm("PATCH", `/ejemplares/${ej3}`, { body: { estado: "baja" } }),
      200,
    );
    borrado(await adm("DELETE", `/ejemplares/${ej3}`), "en baja se elimina");
    esperar(
      await http("GET", `/prestamos/${p.idPrestamo}`, { token: ana.token }),
      404,
      "se llevó su historial",
    );
  });

  it("DELETE /usuarios/{id} elimina las cuentas de prueba (204)", async () => {
    borrado(await http("DELETE", `/usuarios/${ana.id}`, { token: ana.token }));
    borrado(
      await http("DELETE", `/usuarios/${beto.id}`, { token: beto.token }),
    );
  });

  it("DELETE /libros/{isbn} da 409 mientras el libro tiene ejemplares", async () => {
    esperar(await adm("DELETE", `/libros/${isbn}`), 409);
  });

  it("DELETE /ejemplares/{codigoBarras} elimina los ejemplares (204) y después da 404", async () => {
    // sus préstamos ya se eliminaron: sin historial, un ejemplar se elimina directamente
    borrado(await adm("DELETE", `/ejemplares/${ej1}`), ej1);
    borrado(await adm("DELETE", `/ejemplares/${ej2}`), ej2);
    esperar(await adm("DELETE", `/ejemplares/${ej1}`), 404);
  });

  it("DELETE /libros/{isbn} elimina los libros (204) y después da 404", async () => {
    borrado(await adm("DELETE", `/libros/${isbn}`));
    borrado(await adm("DELETE", `/libros/${isbn2}`));
    esperar(await adm("DELETE", `/libros/${isbn}`), 404);
    esperar(await http("GET", `/libros/${isbn}`), 404);
  });
});
