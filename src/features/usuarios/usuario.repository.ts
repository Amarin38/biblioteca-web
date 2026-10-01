import { db } from "../../config/db.ts";
import {
  type FiltrosUsuario,
  type Usuario,
  type UsuarioNuevo,
} from "./usuario.schema.ts";

const SELECT = `SELECT id_usuario AS idUsuario, nombre, email, tipo 
                FROM usuario`;

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
       DELETE TABLE usuario 
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
      WHERE id_usuario = @idUsuario
      RETURNING id_usuario AS idUsuario, nombre, email, tipo
      `,
      )
      .get({ ...datos, id_usuario }) as Usuario;
  },
};
