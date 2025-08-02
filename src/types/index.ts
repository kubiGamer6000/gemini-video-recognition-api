export interface VideoProcessRequest {
  videoUrl: string;
  prompt?: string;
}

export interface VideoProcessResponse {
  success: boolean;
  result?: string;
  error?: string;
  processingTime?: {
    download: number;
    upload: number;
    processing: number;
    total: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
}

// New interfaces for async processing
export interface JobCreateResponse {
  success: boolean;
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  message?: string;
}

export interface JobStatusResponse {
  success: boolean;
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: string;
  error?: string;
  processingTime?: {
    download: number;
    upload: number;
    processing: number;
    total: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Job {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl: string;
  prompt?: string;
  result?: string;
  error?: string;
  processingTime?: {
    download: number;
    upload: number;
    processing: number;
    total: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
