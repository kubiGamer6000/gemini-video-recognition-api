import { v4 as uuidv4 } from "uuid";
import { Job } from "../types";
import logger from "../utils/logger";

export class JobService {
  // In-memory storage (for production, use Redis or a database)
  private jobs: Map<string, Job> = new Map();

  /**
   * Create a new job
   */
  createJob(videoUrl: string, prompt?: string): Job {
    const job: Job = {
      id: uuidv4(),
      status: "pending",
      videoUrl,
      prompt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.jobs.set(job.id, job);
    logger.info("Job created", { jobId: job.id, videoUrl });

    // Clean up old jobs after 1 hour
    setTimeout(() => {
      this.jobs.delete(job.id);
      logger.debug("Job cleaned up", { jobId: job.id });
    }, 3600000); // 1 hour

    return job;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Update job status
   */
  updateJob(jobId: string, updates: Partial<Job>): Job | undefined {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.warn("Job not found for update", { jobId });
      return undefined;
    }

    const updatedJob = {
      ...job,
      ...updates,
      updatedAt: new Date(),
    };

    this.jobs.set(jobId, updatedJob);
    logger.info("Job updated", {
      jobId,
      status: updatedJob.status,
      hasResult: !!updatedJob.result,
      hasError: !!updatedJob.error,
    });

    return updatedJob;
  }

  /**
   * Mark job as processing
   */
  markProcessing(jobId: string): Job | undefined {
    return this.updateJob(jobId, { status: "processing" });
  }

  /**
   * Mark job as completed
   */
  markCompleted(
    jobId: string,
    result: string,
    processingTime?: Job["processingTime"]
  ): Job | undefined {
    return this.updateJob(jobId, {
      status: "completed",
      result,
      processingTime,
    });
  }

  /**
   * Mark job as failed
   */
  markFailed(jobId: string, error: string): Job | undefined {
    return this.updateJob(jobId, {
      status: "failed",
      error,
    });
  }
}

// Export singleton instance
export const jobService = new JobService();
