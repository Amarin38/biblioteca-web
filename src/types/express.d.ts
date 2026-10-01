// src/types/express.d.ts
import "express";

declare module "express-serve-static-core" {
  interface Request {
    valid: {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    };
  }
}

export {};
