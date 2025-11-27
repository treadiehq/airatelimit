# Dashboard Dockerfile - at repo root for Railway compatibility
# This builds the dashboard from the dashboard/ subdirectory
FROM node:20-slim

WORKDIR /app

# Copy dashboard package files
COPY dashboard/package*.json ./

# Install dependencies
RUN npm install

# Copy dashboard source code
COPY dashboard/ .

# Build the static site
RUN npm run generate

# Railway provides PORT env var
ENV PORT=3000

# Serve the static files
CMD npx serve .output/public -l $PORT

