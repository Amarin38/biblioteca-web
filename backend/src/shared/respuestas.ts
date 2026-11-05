import type { Response } from "express";

export const ok = (res: Response, cuerpo: unknown) =>
  res.status(200).json(cuerpo);

export const creado = (res: Response, cuerpo: unknown, ubicacion?: string) => {
  if (ubicacion) res.location(ubicacion);
  return res.status(201).json(cuerpo);
};

export const sinContenido = (res: Response) => res.status(204).end();
