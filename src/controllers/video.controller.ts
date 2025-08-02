import { Request, Response } from "express";
import { GeminiService } from "../services/gemini.service";
import { DownloadService } from "../services/download.service";
import { jobService } from "../services/job.service";
import {
  VideoProcessRequest,
  VideoProcessResponse,
  JobCreateResponse,
  JobStatusResponse,
} from "../types";
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

  /**
   * Original synchronous video processing (kept for backward compatibility)
   * WARNING: This can timeout for long videos!
   */
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
      const downloadResult = await this.downloadService.downloadVideo(videoUrl);
      filePath = downloadResult.filePath;
      downloadTime = Date.now() - downloadStart;

      // Step 2 & 3: Upload to Gemini and process
      const uploadStart = Date.now();
      const result = await this.geminiService.processVideo(
        filePath,
        downloadResult.mimeType,
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

  /**
   * Create a new async video processing job
   * Returns immediately with a job ID
   */
  async createJob(req: Request, res: Response): Promise<void> {
    const { videoUrl, prompt } = req.body as VideoProcessRequest;

    try {
      // Create job and return immediately
      const job = jobService.createJob(videoUrl, prompt);

      const response: JobCreateResponse = {
        success: true,
        jobId: job.id,
        status: job.status,
        message: "Job created successfully. Poll /api/jobs/{jobId} for status.",
      };

      logger.info("Job created for video processing", {
        jobId: job.id,
        videoUrl,
      });

      res.status(202).json(response); // 202 Accepted

      // Process video in the background
      this.processVideoInBackground(job.id, videoUrl, prompt);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to create job", {
        error: errorMessage,
        videoUrl,
      });

      res.status(500).json({
        success: false,
        error: "Failed to create job",
        message: errorMessage,
      });
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;

    const job = jobService.getJob(jobId);

    if (!job) {
      res.status(404).json({
        success: false,
        error: "Job not found",
        message: `No job found with ID: ${jobId}`,
      });
      return;
    }

    const response: JobStatusResponse = {
      success: true,
      jobId: job.id,
      status: job.status,
      result: job.result,
      error: job.error,
      processingTime: job.processingTime,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };

    res.json(response);
  }

  /**
   * Process video in the background
   */
  private async processVideoInBackground(
    jobId: string,
    videoUrl: string,
    prompt?: string
  ): Promise<void> {
    let filePath: string | null = null;
    const startTime = Date.now();

    try {
      // Mark as processing
      jobService.markProcessing(jobId);

      // Step 1: Download video
      const downloadStart = Date.now();
      const downloadResult = await this.downloadService.downloadVideo(videoUrl);
      filePath = downloadResult.filePath;
      const downloadTime = Date.now() - downloadStart;

      // Step 2 & 3: Upload to Gemini and process
      const uploadStart = Date.now();
      const result = await this.geminiService.processVideo(
        filePath,
        downloadResult.mimeType,
        prompt
      );
      const totalGeminiTime = Date.now() - uploadStart;

      // Estimate upload time as 20% of total Gemini time
      const uploadTime = Math.floor(totalGeminiTime * 0.2);
      const processingTime = totalGeminiTime - uploadTime;
      const totalTime = Date.now() - startTime;

      if (!result) {
        throw new Error("Failed to process video with Gemini");
      }

      // Mark as completed
      jobService.markCompleted(jobId, result, {
        download: downloadTime,
        upload: uploadTime,
        processing: processingTime,
        total: totalTime,
      });

      logger.info("Background job completed successfully", {
        jobId,
        totalTime,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Background job failed", {
        jobId,
        error: errorMessage,
      });

      // Mark as failed
      jobService.markFailed(jobId, errorMessage);
    } finally {
      // Clean up downloaded file
      if (filePath) {
        this.downloadService.cleanupFile(filePath);
      }
    }
  }
}
