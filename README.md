# Gemini Video Recognition API

A modern HTTP API that processes videos using Google's Gemini 2.5 Pro model. The API downloads videos from URLs, uploads them to Google Gemini, and returns AI-generated analysis.

## Features

- 🎥 **Video Processing**: Download videos from URLs and analyze them with Gemini AI
- 🔐 **API Key Authentication**: Secure your API with key-based authentication
- 🚀 **Production Ready**: Built with TypeScript, Express, and best practices
- 📊 **Performance Tracking**: Detailed timing metrics for each processing step
- 🛡️ **Security**: Rate limiting, CORS, Helmet, and input validation
- 🐳 **Docker Support**: Easy deployment with Docker and docker-compose
- 📝 **Comprehensive Logging**: Winston-based structured logging

## Prerequisites

- Node.js 18+ (for local development)
- Google Cloud API key with Gemini API access
- Docker (optional, for containerized deployment)

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/gemini-video-recognition.git
cd gemini-video-recognition
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file and update with your values:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Google API Configuration
GOOGLE_API_KEY=your-google-api-key-here

# API Security
API_KEY=your-secure-api-key-here

# Optional: Override defaults
PORT=3000
NODE_ENV=development
```

### 4. Run the development server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Documentation

### Base URL

```
http://localhost:3000
```

### Authentication

All API endpoints require an API key. Include it in your requests using one of these methods:

- Header: `x-api-key: your-api-key`
- Query parameter: `?apiKey=your-api-key`

### Endpoints

#### Health Check

```http
GET /health
```

No authentication required. Returns the health status of the API.

**Response:**

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Process Video (Synchronous)

```http
POST /api/process-video
```

Processes a video from a URL using Google Gemini. **⚠️ Warning: This endpoint can timeout for videos longer than ~60 seconds. Use the async endpoints below for longer videos.**

**Headers:**

```
Content-Type: application/json
x-api-key: your-api-key
```

**Request Body:**

```json
{
  "videoUrl": "https://example.com/video.mp4",
  "prompt": "Analyze this video and describe what's happening" // optional
}
```

**Response:**

```json
{
  "success": true,
  "result": "The video shows...",
  "processingTime": {
    "download": 1500,
    "upload": 2000,
    "processing": 5000,
    "total": 8500
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Failed to process video",
  "message": "Detailed error message"
}
```

#### Create Async Job (Recommended for Long Videos)

```http
POST /api/jobs
```

Creates an async video processing job. Returns immediately with a job ID.

**Headers:**

```
Content-Type: application/json
x-api-key: your-api-key
```

**Request Body:**

```json
{
  "videoUrl": "https://example.com/video.mp4",
  "prompt": "Analyze this video and describe what's happening" // optional
}
```

**Response (202 Accepted):**

```json
{
  "success": true,
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "pending",
  "message": "Job created successfully. Poll /api/jobs/{jobId} for status."
}
```

#### Get Job Status

```http
GET /api/jobs/{jobId}
```

Get the status and result of an async processing job.

**Headers:**

```
x-api-key: your-api-key
```

**Response (Processing):**

```json
{
  "success": true,
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "processing",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:10.000Z"
}
```

**Response (Completed):**

```json
{
  "success": true,
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "result": "The video shows...",
  "processingTime": {
    "download": 5000,
    "upload": 10000,
    "processing": 85000,
    "total": 100000
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:01:40.000Z"
}
```

**Response (Failed):**

```json
{
  "success": true,
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "failed",
  "error": "Video processing failed: Internal error",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:30.000Z"
}
```

### Example Usage

#### cURL

```bash
curl -X POST http://localhost:3000/api/process-video \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "videoUrl": "https://example.com/video.mp4",
    "prompt": "Describe the main events in this video"
  }'
```

#### JavaScript (Fetch)

```javascript
const response = await fetch("http://localhost:3000/api/process-video", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "your-api-key",
  },
  body: JSON.stringify({
    videoUrl: "https://example.com/video.mp4",
    prompt: "Describe the main events in this video",
  }),
});

const result = await response.json();
console.log(result);
```

## Deployment

### Docker Deployment

1. Build the Docker image:

```bash
docker build -t gemini-video-api .
```

2. Run with docker-compose:

```bash
docker-compose up -d
```

### DigitalOcean App Platform

1. Fork this repository to your GitHub account

2. Create a new app in DigitalOcean App Platform

3. Connect your GitHub repository

4. Configure environment variables in the App Platform settings:

   - `GOOGLE_API_KEY`
   - `API_KEY`
   - Any other configuration variables

5. Deploy!

### Netlify Functions (Serverless)

For Netlify deployment, you'll need to create a serverless function wrapper. Create `netlify/functions/api.ts`:

```typescript
import serverless from "serverless-http";
import app from "../../src/app";

export const handler = serverless(app);
```

Add to `package.json`:

```json
{
  "scripts": {
    "build:netlify": "netlify-lambda build src"
  }
}
```

Create `netlify.toml`:

```toml
[build]
  command = "npm run build:netlify"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run TypeScript type checking
- `npm run clean` - Clean build directory

### Project Structure

```
gemini-video-recognition/
├── src/
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Express middleware
│   ├── services/        # Business logic
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   ├── app.ts          # Express app setup
│   └── server.ts       # Server entry point
├── temp/               # Temporary video storage
├── .env.example        # Environment variables example
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker Compose configuration
├── tsconfig.json       # TypeScript configuration
└── README.md          # This file
```

## Security Considerations

1. **API Keys**: Always use strong, randomly generated API keys
2. **HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Adjust rate limits based on your needs
4. **Video URLs**: The API downloads videos from any URL - ensure you trust the sources
5. **File Size**: Consider implementing file size limits for video downloads

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**

   - Ensure you've created a `.env` file with all required variables

2. **"Video file did not become active within the timeout period"**

   - Large videos may take longer to process. The timeout is set to 10 minutes.

3. **Rate limit exceeded**
   - Default rate limit is 100 requests per 15 minutes per IP

### Logs

The API uses Winston for structured logging. Logs include:

- Request details
- Processing steps
- Error information
- Performance metrics

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For issues and questions:

- Open an issue on GitHub
- Check existing issues for solutions
- Review the logs for detailed error information
