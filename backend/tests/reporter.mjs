// Reporte compacto para node:test (como pytest): un punto por prueba, y al final el resumen y el motivo de cada fallo.
//   node --test --test-reporter=./tests/reporter.mjs tests/api.test.mjs
const TTY = process.stdout.isTTY;
const color = (codigo, texto) =>
  TTY ? `\x1b[${codigo}m${texto}\x1b[0m` : texto;
const corto = (v) => {
  const t =
    typeof v === "string"
      ? JSON.stringify(v)
      : (JSON.stringify(v) ?? String(v));
  return t.length > 80 ? `${t.slice(0, 77)}...` : t;
};
// "mensaje\n\n401 !== 200\n" -> "mensaje — 401 !== 200"
const enUnaLinea = (texto) =>
  String(texto ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" — ")
    .slice(0, 200);

export default async function* reporte(fuente) {
  const inicio = Date.now();
  let pasaron = 0;
  let sinCorrer = 0;
  let omitidas = 0;
  let stderr = "";
  const fallos = [];
  const arranque = new Set(); // fallos de los before/after: impiden correr las pruebas

  for await (const { type, data } of fuente) {
    if (type === "test:stderr") stderr += data.message;
    if (type !== "test:pass" && type !== "test:fail") continue;
    const error = data.details?.error;
    const causa = error?.cause ?? error;

    if (data.details?.type === "suite") {
      // Los grupos (describe) no se cuentan; solo importa si falló algo previo a sus pruebas
      if (type === "test:fail" && error?.failureType === "hookFailed")
        arranque.add(enUnaLinea(causa?.message ?? error.message));
      continue;
    }
    if (
      type === "test:pass" &&
      data.skip !== undefined &&
      data.skip !== false
    ) {
      omitidas += 1;
      yield color(33, "-");
    } else if (type === "test:pass") {
      pasaron += 1;
      yield color(32, ".");
    } else if (error?.failureType === "cancelledByParent") {
      sinCorrer += 1; // no corrió porque falló el arranque del grupo
      yield color(33, "s");
    } else {
      const linea = /api\.test\.mjs:(\d+)/.exec(causa?.stack ?? "")?.[1];
      let motivo;
      if (causa?.code === "ERR_ASSERTION" && "actual" in causa) {
        motivo = `esperaba ${corto(causa.expected)} y recibió ${corto(causa.actual)}`;
        if (causa.generatedMessage === false)
          motivo += ` (${String(causa.message).split("\n")[0]})`;
      } else {
        motivo = enUnaLinea(causa?.message ?? error?.message) || "falló";
      }
      fallos.push({ nombre: data.name, motivo, linea });
      yield color(31, "F");
    }
  }

  let salida = "\n\n";
  for (const motivo of arranque)
    salida += `${color(31, "✗ No se pudo empezar:")} ${motivo}\n`;
  for (const f of fallos)
    salida += `${color(31, "✗")} ${f.nombre}\n    ${f.motivo}${f.linea ? `  (api.test.mjs:${f.linea})` : ""}\n`;
  // Si un archivo ni siquiera se pudo cargar (por ejemplo, un error de sintaxis) el motivo está en stderr
  if (fallos.some((f) => f.motivo === "test failed") && stderr.trim()) {
    salida += `\n${stderr.trim().split("\n").slice(0, 8).join("\n")}\n`;
  }
  if (salida !== "\n\n") salida += "\n";
  yield salida;

  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
  const omitidasTxt = omitidas ? `, ${color(33, `${omitidas} omitidas`)}` : "";
  if (fallos.length === 0 && sinCorrer === 0) {
    yield `${color(32, `✓ ${pasaron} pruebas pasaron`)}${omitidasTxt} (${segundos} s)\n`;
    return;
  }
  const partes = [];
  if (fallos.length) partes.push(color(31, `${fallos.length} fallaron`));
  if (sinCorrer) partes.push(color(33, `${sinCorrer} sin correr`));
  yield `✗ ${partes.join(", ")}, ${pasaron} pasaron${omitidasTxt} (${segundos} s)\n`;
}
