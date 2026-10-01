import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");

export const db = new Database("data/biblioteca.db");
export const transaccion = (fn) => db.transaction(fn);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function migrate() {
  db.exec(readFileSync(join(ROOT, "src/db/schema.sql"), "utf8"));
}
