import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import fs from "fs";
import logger from "../utils/logger";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Process a video using Google's Gemini 2.5 Pro model
   * @param filePath Path to the video file
   * @param prompt Custom prompt for video description
   * @returns Promise<string | null> Description of the video or null if processing fails
   */
  async processVideo(
    filePath: string,
    mimeType: string = "video/mp4",
    prompt: string = process.env.VIDEO_PROMPT ||
      "Outline this video content in full detail. Give a general concise summary and then a full chronological breakdown of different scenes/parts/events."
  ): Promise<string | null> {
    // Track time for performance monitoring
    const startTime = Date.now();

    try {
      if (!fs.existsSync(filePath)) {
        logger.error("Video file not found", { filePath });
        return null;
      }

      logger.debug("Uploading video to Gemini API", { filePath });
      // Upload the video file
      const videoFile = await this.ai.files.upload({
        file: filePath,
        config: { mimeType: mimeType },
      });

      // Poll for file ready status
      logger.debug("Waiting for video to be processed by Gemini", {
        fileId: videoFile.name,
      });
      const maxAttempts = 60; // 10 minutes max wait time (60 * 10 seconds = 10 minutes)
      let attempts = 0;
      let fileReady = false;

      while (!fileReady && attempts < maxAttempts) {
        if (!videoFile.name) {
          logger.error("Video file name not found", { fileId: videoFile.name });
          throw new Error("Video file name not found");
        }
        const fetchedFile = await this.ai.files.get({ name: videoFile.name });
        if (fetchedFile.state === "ACTIVE") {
          fileReady = true;
          logger.debug("Video file is now active and ready for processing", {
            fileId: videoFile.name,
          });
        } else {
          attempts++;
          logger.debug("Video file not ready yet, waiting 10 seconds", {
            fileId: videoFile.name,
            state: fetchedFile.state,
            attempt: attempts,
          });
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }
      }

      if (!fileReady) {
        logger.error(
          "Video file did not become active within the timeout period",
          { fileId: videoFile.name }
        );
        throw new Error("Timeout waiting for video file to become active");
      }

      // Process the video with Gemini
      logger.debug("Sending video to Gemini 2.5 Pro for analysis", {
        filePath,
      });
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: createUserContent([
          createPartFromUri(videoFile.uri || "", videoFile.mimeType || ""),
          prompt,
        ]),
      });

      const processingTime = Date.now() - startTime;
      logger.debug("Video processed successfully", { processingTime });

      return response.text || null;
    } catch (error) {
      const errorObj =
        error instanceof Error
          ? { message: error.message, name: error.name, stack: error.stack }
          : error;

      logger.error("Video processing failed", {
        err: errorObj,
        filePath,
        processingTime: Date.now() - startTime,
      });

      throw error;
    }
  }
}
