import { db } from "../../config/db";

const SELECT = `SELECT id_usuario AS idUsuario, nombre, email, tipo 
                FROM usuario`;

export const usuarioRepository = {
  findAll({ limit = 50, offset = 0 } = {}) {
    return db
      .prepare(`${SELECT} ORDER BY nombre LIMIT = ? OFFSET = ?`)
      .all(limit, offset);
  },

  findByIdUsuario(id_usuario) {
    return db.prepare(`${SELECT} WHERE idUsuario = ?`).get(id_usuario);
  },

  findByEmail(email) {
    return db.prepare(`${SELECT} WHERE email = ?`).get(email);
  },

  insert(usuario) {
    db.prepare(
      `
      INSERT INTO usuario (id_usuario, nombre, email, tipo)
      VALUES (@idUsuario, @nombre, @email, @tipo)`,
    ).run(usuario);
    return this.findByIdUsuario(usuario.id_usuario);
  },

  deleteByIdUsuario(id_usuario) {
    return db
      .prepare(
        `DELETE TABLE usuario 
      WHERE id_usuario = ?`,
      )
      .run(id_usuario).changes;
  },

  updateTipo(id_usuario, tipo) {
    db.prepare(
      `
      UPDATE TABLE usuario
      SET tipo = ?
      WHERE id_usuario = ?
      `,
    ).run(tipo, id_usuario);

    return this.findByIdUsuario(id_usuario);
  },
};
