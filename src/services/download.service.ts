import axios from "axios";
import fs from "fs";
import path from "path";
import logger from "../utils/logger";
import { v4 as uuidv4 } from "uuid";

export interface DownloadResult {
  filePath: string;
  mimeType: string;
}

export class DownloadService {
  private tempDir: string;
  private readonly videoMimeTypes: Record<string, string> = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/ogg": ".ogv",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi",
    "video/x-matroska": ".mkv",
    "video/3gpp": ".3gp",
    "video/x-flv": ".flv",
    "application/octet-stream": ".mp4", // Default for unknown binary
  };

  constructor(tempDir: string = "./temp") {
    this.tempDir = tempDir;
    this.ensureTempDir();
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Get file extension from mime type
   * @param mimeType The MIME type
   * @returns File extension with dot
   */
  private getExtensionFromMimeType(mimeType: string): string {
    // Clean up mime type (remove charset and other parameters)
    const cleanMimeType = mimeType.split(";")[0].trim().toLowerCase();
    return this.videoMimeTypes[cleanMimeType] || ".mp4";
  }

  /**
   * Detect actual video mime type from URL and content type
   * @param url The video URL
   * @param detectedMimeType The mime type from headers
   * @returns Corrected mime type
   */
  private correctVideoMimeType(url: string, detectedMimeType: string): string {
    const cleanMimeType = detectedMimeType.split(";")[0].trim().toLowerCase();

    // If we already have a valid video mime type, use it
    if (cleanMimeType.startsWith("video/")) {
      return cleanMimeType;
    }

    // If content type is generic, try to infer from URL patterns
    if (
      cleanMimeType === "application/octet-stream" ||
      cleanMimeType === "binary/octet-stream"
    ) {
      // Check for known video CDN patterns
      if (url.includes("fbcdn.net") || url.includes("facebook.com")) {
        // Facebook videos are typically MP4
        return "video/mp4";
      }

      if (url.includes("instagram.com") || url.includes("cdninstagram.com")) {
        // Instagram videos are typically MP4
        return "video/mp4";
      }

      if (url.includes("youtube.com") || url.includes("ytimg.com")) {
        // YouTube videos are typically MP4
        return "video/mp4";
      }

      if (url.includes("tiktok.com") || url.includes("tiktokcdn.com")) {
        // TikTok videos are typically MP4
        return "video/mp4";
      }

      // Check URL for video file extensions
      const urlLower = url.toLowerCase();
      if (urlLower.includes(".mp4") || urlLower.includes("mp4")) {
        return "video/mp4";
      }
      if (urlLower.includes(".webm") || urlLower.includes("webm")) {
        return "video/webm";
      }
      if (urlLower.includes(".mov") || urlLower.includes("mov")) {
        return "video/quicktime";
      }
      if (urlLower.includes(".avi") || urlLower.includes("avi")) {
        return "video/x-msvideo";
      }

      // Default fallback for unknown binary content from video-like URLs
      if (
        urlLower.includes("video") ||
        urlLower.includes("v/") ||
        urlLower.includes("/v?")
      ) {
        return "video/mp4";
      }
    }

    // Return original if no corrections needed
    return cleanMimeType || "video/mp4";
  }

  /**
   * Download a video from a URL to a temporary file
   * @param videoUrl URL of the video to download
   * @returns Promise<DownloadResult> Object containing file path and detected mime type
   */
  async downloadVideo(videoUrl: string): Promise<DownloadResult> {
    const startTime = Date.now();
    const tempFileName = `${uuidv4()}.tmp`;
    const tempFilePath = path.join(this.tempDir, tempFileName);

    try {
      logger.info("Starting video download", { videoUrl });

      // First, make a HEAD request to get content type without downloading
      let contentType = "application/octet-stream";
      try {
        const headResponse = await axios.head(videoUrl, {
          timeout: 10000,
          maxRedirects: 5,
        });
        contentType = headResponse.headers["content-type"] || contentType;
        logger.debug("Detected content type from HEAD request", {
          contentType,
        });
      } catch (headError) {
        logger.warn("HEAD request failed, will detect from GET response", {
          error: headError instanceof Error ? headError.message : headError,
        });
      }

      const response = await axios({
        method: "GET",
        url: videoUrl,
        responseType: "stream",
        timeout: 300000, // 5 minutes timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; VideoBot/1.0)",
        },
      });

      // Get content type from response headers if not already detected
      const responseContentType = response.headers["content-type"];
      if (responseContentType) {
        contentType = responseContentType;
        logger.debug("Content type from response", { contentType });
      }

      // Correct the content type using URL analysis and smart detection
      const correctedContentType = this.correctVideoMimeType(
        videoUrl,
        contentType
      );
      if (correctedContentType !== contentType) {
        logger.info("Corrected content type", {
          original: contentType,
          corrected: correctedContentType,
          reason: "URL pattern analysis",
        });
        contentType = correctedContentType;
      }

      // Determine file extension based on content type
      const extension = this.getExtensionFromMimeType(contentType);
      const finalFileName = `${uuidv4()}${extension}`;
      const finalFilePath = path.join(this.tempDir, finalFileName);

      const writer = fs.createWriteStream(tempFilePath);

      // Track download progress
      let downloadedBytes = 0;
      const totalBytes = parseInt(response.headers["content-length"] || "0");

      response.data.on("data", (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        const progress =
          totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;

        if (progress > 0 && Math.floor(progress) % 10 === 0) {
          logger.debug("Download progress", {
            progress: Math.floor(progress),
            downloadedBytes,
            totalBytes,
          });
        }
      });

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on("finish", () => {
          // Rename temp file to final file with proper extension
          fs.renameSync(tempFilePath, finalFilePath);

          const downloadTime = Date.now() - startTime;
          logger.info("Video download completed", {
            filePath: finalFilePath,
            downloadTime,
            fileSize: downloadedBytes,
            mimeType: contentType,
            extension,
          });

          resolve({
            filePath: finalFilePath,
            mimeType: contentType.split(";")[0].trim(), // Clean mime type
          });
        });

        writer.on("error", (error) => {
          logger.error("Error writing video file", {
            error,
            filePath: tempFilePath,
          });
          this.cleanupFile(tempFilePath);
          reject(error);
        });

        response.data.on("error", (error: Error) => {
          logger.error("Error downloading video", { error, videoUrl });
          this.cleanupFile(tempFilePath);
          reject(error);
        });
      });
    } catch (error) {
      logger.error("Failed to download video", {
        error: error instanceof Error ? error.message : error,
        videoUrl,
      });
      this.cleanupFile(tempFilePath);
      throw error;
    }
  }

  /**
   * Clean up a file if it exists
   * @param filePath Path to the file to clean up
   */
  cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug("Cleaned up file", { filePath });
      }
    } catch (error) {
      logger.error("Failed to cleanup file", {
        error: error instanceof Error ? error.message : error,
        filePath,
      });
    }
  }

  /**
   * Clean up all files in the temp directory
   */
  cleanupTempDir(): void {
    try {
      const files = fs.readdirSync(this.tempDir);
      files.forEach((file) => {
        const filePath = path.join(this.tempDir, file);
        this.cleanupFile(filePath);
      });
      logger.info("Cleaned up temp directory");
    } catch (error) {
      logger.error("Failed to cleanup temp directory", {
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}
