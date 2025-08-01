import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { VideoController } from "./controllers/video.controller";
import { authenticateApiKey } from "./middleware/auth.middleware";
import { validateVideoProcessRequest } from "./middleware/validation.middleware";
import logger from "./utils/logger";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Initialize controllers
const videoController = new VideoController();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "x-api-key"],
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// Health check endpoint (no auth required)
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// API info endpoint (no auth required)
app.get("/", (req, res) => {
  res.json({
    name: "Gemini Video Recognition API",
    version: "1.0.0",
    endpoints: {
      health: "GET /health",
      processVideo: "POST /api/process-video",
    },
    authentication: "API key required for /api/* endpoints",
  });
});

// Video processing endpoint
app.post(
  "/api/process-video",
  authenticateApiKey,
  validateVideoProcessRequest,
  async (req, res) => {
    await videoController.processVideo(req, res);
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Global error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error("Unhandled error", {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });

    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

export default app;
