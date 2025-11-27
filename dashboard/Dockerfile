# Dashboard Dockerfile - Static SPA build
FROM node:20-slim

WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the static site
RUN npm run generate

# Expose port
EXPOSE 3000

# Serve the static files
CMD ["npx", "serve", ".output/public", "-l", "3000"]

