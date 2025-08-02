/**
 * Example: How to use the Async API to avoid timeouts
 *
 * This shows how to:
 * 1. Create a job
 * 2. Poll for completion
 * 3. Get the result
 */

const API_URL = "https://your-api-url.com"; // or 'http://localhost:3000'
const API_KEY = "your-api-key";
const VIDEO_URL = "https://example.com/long-video.mp4";

async function processVideoAsync(videoUrl, prompt) {
  console.log("Creating job for video:", videoUrl);

  // Step 1: Create the job
  const createResponse = await fetch(`${API_URL}/api/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({
      videoUrl,
      prompt,
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create job: ${createResponse.statusText}`);
  }

  const job = await createResponse.json();
  console.log("Job created:", job.jobId);

  // Step 2: Poll for completion
  let result;
  let attempts = 0;
  const maxAttempts = 60; // 10 minutes max (10 second intervals)

  while (attempts < maxAttempts) {
    console.log(
      `Checking job status... (attempt ${attempts + 1}/${maxAttempts})`
    );

    const statusResponse = await fetch(`${API_URL}/api/jobs/${job.jobId}`, {
      headers: {
        "x-api-key": API_KEY,
      },
    });

    if (!statusResponse.ok) {
      throw new Error(`Failed to get job status: ${statusResponse.statusText}`);
    }

    result = await statusResponse.json();
    console.log("Job status:", result.status);

    if (result.status === "completed") {
      console.log("Job completed!");
      break;
    } else if (result.status === "failed") {
      throw new Error(`Job failed: ${result.error}`);
    }

    // Wait 10 seconds before next poll
    await new Promise((resolve) => setTimeout(resolve, 10000));
    attempts++;
  }

  if (result.status !== "completed") {
    throw new Error("Job timed out after 10 minutes");
  }

  // Step 3: Return the result
  return result;
}

// Usage example
async function main() {
  try {
    const result = await processVideoAsync(
      VIDEO_URL,
      "Describe this video in detail with a full transcript"
    );

    console.log("\n=== RESULT ===");
    console.log("Video analysis:", result.result);
    console.log("\nProcessing times:");
    console.log(`- Download: ${result.processingTime.download}ms`);
    console.log(`- Upload: ${result.processingTime.upload}ms`);
    console.log(`- Processing: ${result.processingTime.processing}ms`);
    console.log(
      `- Total: ${result.processingTime.total}ms (${Math.round(
        result.processingTime.total / 1000
      )}s)`
    );
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Alternative: Using async/await with a polling helper
class VideoProcessor {
  constructor(apiUrl, apiKey) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async processVideo(videoUrl, prompt, options = {}) {
    const {
      pollInterval = 10000, // 10 seconds
      timeout = 600000, // 10 minutes
    } = options;

    // Create job
    const job = await this.createJob(videoUrl, prompt);

    // Poll until complete
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const status = await this.getJobStatus(job.jobId);

      if (status.status === "completed") {
        return status;
      } else if (status.status === "failed") {
        throw new Error(status.error || "Job failed");
      }

      await this.sleep(pollInterval);
    }

    throw new Error("Processing timeout");
  }

  async createJob(videoUrl, prompt) {
    const response = await fetch(`${this.apiUrl}/api/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify({ videoUrl, prompt }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getJobStatus(jobId) {
    const response = await fetch(`${this.apiUrl}/api/jobs/${jobId}`, {
      headers: {
        "x-api-key": this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Example usage with the class
async function exampleWithClass() {
  const processor = new VideoProcessor(API_URL, API_KEY);

  try {
    const result = await processor.processVideo(
      VIDEO_URL,
      "Analyze this video",
      { pollInterval: 5000 } // Poll every 5 seconds
    );

    console.log("Result:", result.result);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Run the example
if (require.main === module) {
  main();
}
