import { db } from "../../config/db.ts";
import type {
  FiltrosUsuario,
  Usuario,
  UsuarioNuevo,
  FilaAuth,
} from "../../types/index.ts";

const SELECT = `SELECT id_usuario AS idUsuario, nombre, email, tipo 
                FROM usuario`;

let columnasListas = false;
function asegurarColumnas() {
  if (columnasListas) return;

  const columnas = (
    db.prepare("PRAGMA table_info(usuario)").all() as { name: string }[]
  ).map((c) => c.name);

  if (!columnas.length) return;

  if (!columnas.includes("password_hash"))
    db.exec("ALTER TABLE usuario ADD COLUMN password_hash TEXT");

  if (!columnas.includes("es_admin"))
    db.exec(
      "ALTER TABLE usuario ADD COLUMN es_admin INTEGER NOT NULL DEFAULT 0",
    );

  columnasListas = true;
}

export const usuarioRepository = {
  findAll({ nombre, email, tipo, limit = 50, offset = 0 }: FiltrosUsuario) {
    const cond = [];
    const params = [];

    if (nombre) {
      cond.push("nombre LIKE ?");
      params.push(`%${nombre}%`);
    }

    if (email) {
      cond.push("email LIKE ?");
      params.push(`%${email}%`);
    }

    if (tipo) {
      cond.push("tipo LIKE ?");
      params.push(`%${tipo}%`);
    }

    const WHERE = cond.length ? `WHERE ${cond.join(" AND ")}` : "";

    return db
      .prepare(`${SELECT} ${WHERE} ORDER BY nombre LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);
  },

  findByIdUsuario(id_usuario: number) {
    return db
      .prepare(`${SELECT} WHERE idUsuario = ?`)
      .get(id_usuario) as Usuario;
  },

  findByEmail(email: string) {
    return db.prepare(`${SELECT} WHERE email = ?`).get(email) as Usuario;
  },

  insert(usuario: Usuario): Usuario {
    const info = db
      .prepare(
        `
      INSERT INTO usuario (nombre, email, tipo)
      VALUES (@nombre, @email, @tipo)`,
      )
      .run(usuario);

    return this.findByIdUsuario(Number(info.lastInsertRowid));
  },

  deleteByIdUsuario(id_usuario: number) {
    return db
      .prepare(
        `
       DELETE FROM usuario
       WHERE id_usuario = ?`,
      )
      .run(id_usuario).changes;
  },

  update(id_usuario: number, datos: UsuarioNuevo) {
    return db
      .prepare(
        `
      UPDATE usuario
      SET nombre = @nombre, email = @email, tipo = @tipo
      WHERE id_usuario = @id_usuario
      RETURNING id_usuario AS idUsuario, nombre, email, tipo
      `,
      )
      .get({ ...datos, id_usuario }) as Usuario;
  },

  findAuthByEmail(email: string): FilaAuth | undefined {
    asegurarColumnas();
    return db
      .prepare(
        `SELECT id_usuario, nombre, email, tipo, es_admin, password_hash 
                 FROM usuario 
                 WHERE email = ? COLLATE NOCASE`,
      )
      .get(email) as FilaAuth | undefined;
  },

  insertConPassword(nombre: string, email: string, hash: string): number {
    asegurarColumnas();
    const info = db
      .prepare(
        `INSERT INTO usuario (nombre, email, tipo, password_hash) 
                 VALUES (?, ?, 'normal', ?)`,
      )
      .run(nombre, email, hash);
    return Number(info.lastInsertRowid);
  },

  // undefined = la cuenta ya no existe
  esAdmin(id: number): boolean | undefined {
    asegurarColumnas();
    const fila = db
      .prepare(
        `SELECT es_admin 
                 FROM usuario 
                 WHERE id_usuario = ?`,
      )
      .get(id) as { es_admin: number } | undefined;
    return fila ? fila.es_admin === 1 : undefined;
  },
};
