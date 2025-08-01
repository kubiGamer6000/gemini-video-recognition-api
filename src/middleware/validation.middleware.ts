import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import logger from "../utils/logger";

export const validateVideoProcessRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const schema = Joi.object({
    videoUrl: Joi.string()
      .uri({ scheme: ["http", "https"] })
      .required()
      .messages({
        "string.uri": "videoUrl must be a valid HTTP or HTTPS URL",
        "any.required": "videoUrl is required",
      }),
    prompt: Joi.string().min(1).max(5000).optional().messages({
      "string.min": "prompt must be at least 1 character long",
      "string.max": "prompt must not exceed 5000 characters",
    }),
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    logger.warn("Validation error", {
      error: error.details[0].message,
      body: req.body,
    });
    res.status(400).json({
      success: false,
      error: "Validation error",
      message: error.details[0].message,
    });
    return;
  }

  // Replace body with validated values
  req.body = value;
  next();
};
