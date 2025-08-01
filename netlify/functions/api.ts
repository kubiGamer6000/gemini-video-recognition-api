import serverless from "serverless-http";
import app from "../../src/app";

// Handler for Netlify Functions
export const handler = serverless(app, {
  request: (request: any) => {
    // Netlify functions have a different path structure
    // This ensures the correct path is used
    if (request.url && request.url.startsWith("/.netlify/functions/api")) {
      request.url = request.url.replace("/.netlify/functions/api", "");
      if (!request.url) {
        request.url = "/";
      }
    }
    return request;
  },
});
