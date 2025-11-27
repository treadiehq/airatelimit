# Backend Dockerfile - NestJS API
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the NestJS app
RUN npm run build

# Railway provides PORT env var
ENV PORT=3000

# Start the server
CMD ["node", "dist/src/main.js"]
