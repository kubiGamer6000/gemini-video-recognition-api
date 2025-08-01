import axios from "axios";
import fs from "fs";
import path from "path";
import logger from "../utils/logger";
import { v4 as uuidv4 } from "uuid";

export class DownloadService {
  private tempDir: string;

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
   * Download a video from a URL to a temporary file
   * @param videoUrl URL of the video to download
   * @returns Promise<string> Path to the downloaded file
   */
  async downloadVideo(videoUrl: string): Promise<string> {
    const startTime = Date.now();
    const fileName = `${uuidv4()}.mp4`;
    const filePath = path.join(this.tempDir, fileName);

    try {
      logger.info("Starting video download", { videoUrl });

      const response = await axios({
        method: "GET",
        url: videoUrl,
        responseType: "stream",
        timeout: 300000, // 5 minutes timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const writer = fs.createWriteStream(filePath);

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
          const downloadTime = Date.now() - startTime;
          logger.info("Video download completed", {
            filePath,
            downloadTime,
            fileSize: downloadedBytes,
          });
          resolve(filePath);
        });

        writer.on("error", (error) => {
          logger.error("Error writing video file", { error, filePath });
          this.cleanupFile(filePath);
          reject(error);
        });

        response.data.on("error", (error: Error) => {
          logger.error("Error downloading video", { error, videoUrl });
          this.cleanupFile(filePath);
          reject(error);
        });
      });
    } catch (error) {
      logger.error("Failed to download video", {
        error: error instanceof Error ? error.message : error,
        videoUrl,
      });
      this.cleanupFile(filePath);
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
