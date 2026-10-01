import { BadRequestError } from "../shared/errors.ts";

export const validate =
  (schema, fuente = "body") =>
  (req, res, next) => {
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
