# Backend Dockerfile - NestJS API
FROM node:20-slim

# ====================================
# SECURITY: Don't run as root
# ====================================
# Create a non-root user for running the application
RUN groupadd --gid 1001 nodejs \
    && useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nodejs

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY --chown=nodejs:nodejs . .

# Build the NestJS app
RUN npm run build

# Remove dev dependencies and source after build
RUN rm -rf src/ node_modules/ \
    && npm ci --only=production --ignore-scripts \
    && npm cache clean --force

# ====================================
# SECURITY: Switch to non-root user
# ====================================
USER nodejs

# Railway provides PORT env var
ENV PORT=3000
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the server
CMD ["node", "dist/main.js"]
