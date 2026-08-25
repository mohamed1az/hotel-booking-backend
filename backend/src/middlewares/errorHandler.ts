import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

export const errorHandler = (err: any,req: Request,res: Response,next: NextFunction) => {
  let statusCode = err.statusCode || 500;
  let message = err.isOperational ? err.message : "Internal server error";

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = 400;
      message = "This value is already in use.";
    } else if (err.code === "P2025") {
      statusCode = 404;
      message = "Record not found.";
    }
  }

  
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired, please login again";
  }

  res.status(statusCode).json({
    success: false,
    message: message,
  });
};