
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";

export const restrictTo = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || !allowedRoles.includes(user.role)) {
      throw new AppError("You do not have permission to perform this action", 403);
    }
    
    next();
  };
};