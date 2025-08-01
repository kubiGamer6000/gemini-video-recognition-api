import { Request, Response } from "express";
import { GeminiService } from "../services/gemini.service";
import { DownloadService } from "../services/download.service";
import { VideoProcessRequest, VideoProcessResponse } from "../types";
import logger from "../utils/logger";

export class VideoController {
  private geminiService: GeminiService;
  private downloadService: DownloadService;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY is not configured");
    }
    this.geminiService = new GeminiService(apiKey);
    this.downloadService = new DownloadService(process.env.TEMP_DIR);
  }

  async processVideo(req: Request, res: Response): Promise<void> {
    const { videoUrl, prompt } = req.body as VideoProcessRequest;
    const startTime = Date.now();
    let downloadTime = 0;
    let uploadTime = 0;
    let processingTime = 0;
    let filePath: string | null = null;

    try {
      logger.info("Starting video processing request", { videoUrl });

      // Step 1: Download video
      const downloadStart = Date.now();
      filePath = await this.downloadService.downloadVideo(videoUrl);
      downloadTime = Date.now() - downloadStart;

      // Step 2 & 3: Upload to Gemini and process
      const uploadStart = Date.now();
      const result = await this.geminiService.processVideo(
        filePath,
        "video/mp4",
        prompt
      );
      const totalGeminiTime = Date.now() - uploadStart;

      // Estimate upload time as 20% of total Gemini time (rough estimate)
      uploadTime = Math.floor(totalGeminiTime * 0.2);
      processingTime = totalGeminiTime - uploadTime;

      if (!result) {
        throw new Error("Failed to process video with Gemini");
      }

      const totalTime = Date.now() - startTime;

      const response: VideoProcessResponse = {
        success: true,
        result,
        processingTime: {
          download: downloadTime,
          upload: uploadTime,
          processing: processingTime,
          total: totalTime,
        },
      };

      logger.info("Video processing completed successfully", {
        videoUrl,
        totalTime,
      });

      res.json(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Video processing failed", {
        error: errorMessage,
        videoUrl,
      });

      const response = {
        success: false,
        error: "Failed to process video",
        message: errorMessage,
      };

      res.status(500).json(response);
    } finally {
      // Clean up downloaded file
      if (filePath) {
        this.downloadService.cleanupFile(filePath);
      }
    }
  }
}
