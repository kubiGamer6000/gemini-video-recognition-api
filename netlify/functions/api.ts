import serverless from "serverless-http";
import app from "../../dist/app";

// Handler for Netlify Functions
export const handler = serverless(app, {
  request: (request: any, context: any) => {
    // Netlify functions have a different path structure
    // This ensures the correct path is used
    if (request.url && request.url.startsWith("/.netlify/functions/api")) {
      request.url = request.url.replace("/.netlify/functions/api", "");
      if (!request.url) {
        request.url = "/";
      }
    }

    // Add Netlify context for debugging
    request.netlifyContext = context;

    return request;
  },
  response: (response: any) => {
    // Ensure proper headers for Netlify
    if (!response.headers) {
      response.headers = {};
    }

    return response;
  },
});
