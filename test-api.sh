#!/bin/bash

# Default values
API_URL="http://localhost:3000"
API_KEY=""
VIDEO_URL=""
PROMPT="Describe this video in detail"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --api-key)
      API_KEY="$2"
      shift 2
      ;;
    --video-url)
      VIDEO_URL="$2"
      shift 2
      ;;
    --prompt)
      PROMPT="$2"
      shift 2
      ;;
    --api-url)
      API_URL="$2"
      shift 2
      ;;
    --help)
      echo "Usage: ./test-api.sh --api-key YOUR_API_KEY --video-url VIDEO_URL [options]"
      echo ""
      echo "Options:"
      echo "  --api-key     Required. Your API key"
      echo "  --video-url   Required. URL of the video to process"
      echo "  --prompt      Optional. Custom prompt (default: 'Describe this video in detail')"
      echo "  --api-url     Optional. API URL (default: http://localhost:3000)"
      echo "  --help        Show this help message"
      echo ""
      echo "Example:"
      echo "  ./test-api.sh --api-key abc123 --video-url https://example.com/video.mp4"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check required parameters
if [ -z "$API_KEY" ]; then
  echo "Error: --api-key is required"
  echo "Use --help for usage information"
  exit 1
fi

if [ -z "$VIDEO_URL" ]; then
  echo "Error: --video-url is required"
  echo "Use --help for usage information"
  exit 1
fi

echo "🔍 Testing Gemini Video Recognition API..."
echo "API URL: $API_URL"
echo "Video URL: $VIDEO_URL"
echo ""

# Test health endpoint
echo "1️⃣  Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$API_URL/health")
if [ $? -eq 0 ]; then
  echo "✅ Health check passed"
  echo "Response: $HEALTH_RESPONSE"
else
  echo "❌ Health check failed"
  exit 1
fi

echo ""
echo "2️⃣  Processing video..."
echo "This may take a few minutes depending on the video size..."

# Process video
START_TIME=$(date +%s)

RESPONSE=$(curl -s -X POST "$API_URL/api/process-video" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{
    \"videoUrl\": \"$VIDEO_URL\",
    \"prompt\": \"$PROMPT\"
  }")

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Check if request was successful
if [ $? -eq 0 ]; then
  # Check if response contains success field
  SUCCESS=$(echo "$RESPONSE" | grep -o '"success":[^,}]*' | grep -o 'true\|false')
  
  if [ "$SUCCESS" = "true" ]; then
    echo "✅ Video processed successfully in ${DURATION}s"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  else
    echo "❌ Video processing failed"
    echo "Response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    exit 1
  fi
else
  echo "❌ Request failed"
  exit 1
fi 