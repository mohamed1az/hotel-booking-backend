import  { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const validate = (schema: z.ZodType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await schema.safeParseAsync(req.body);

      if (!result.success) {
        return res.status(400).json({
          status: "fail",
          message: "Validation failed",
          errors: result.error.flatten().fieldErrors,
        });
      }

      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};