import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");

export const db = new Database(process.env.DB_PATH ?? "data/biblioteca.db");
export const transaccion = <A extends unknown[], R>(fn: (...args: A) => R) =>
  db.transaction(fn);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function migrate() {
  db.exec(
    readFileSync(join(import.meta.dirname, "..", "db", "schema.sql"), "utf8"),
  );
}
