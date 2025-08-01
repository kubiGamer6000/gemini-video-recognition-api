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
