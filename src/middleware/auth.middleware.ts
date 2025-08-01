import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export interface AuthRequest extends Request {
  apiKey?: string;
}

export const authenticateApiKey = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers["x-api-key"] || req.query.apiKey;
  const configuredApiKey = process.env.API_KEY;

  if (!configuredApiKey) {
    logger.error("API_KEY not configured in environment variables");
    res.status(500).json({
      success: false,
      error: "Server configuration error",
    });
    return;
  }

  if (!apiKey) {
    logger.warn("API request without API key", {
      ip: req.ip,
      path: req.path,
    });
    res.status(401).json({
      success: false,
      error: "API key required",
      message:
        "Please provide an API key in the x-api-key header or apiKey query parameter",
    });
    return;
  }

  if (apiKey !== configuredApiKey) {
    logger.warn("API request with invalid API key", {
      ip: req.ip,
      path: req.path,
    });
    res.status(401).json({
      success: false,
      error: "Invalid API key",
    });
    return;
  }

  // Store API key in request for potential future use
  req.apiKey = apiKey as string;
  next();
};
