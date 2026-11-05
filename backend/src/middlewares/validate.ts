import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { BadRequestError } from "../shared/errors.ts";

type Fuente = "body" | "query" | "params";

export const validate =
  (schema: ZodType, fuente: Fuente = "body") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const r = schema.safeParse(req[fuente]);
    if (!r.success) {
      throw new BadRequestError(
        r.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      );
    }
    req.valid = { ...req.valid, [fuente]: r.data };
    next();
  };
