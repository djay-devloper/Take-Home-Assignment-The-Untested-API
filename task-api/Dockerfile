# Multi-stage / lean production Dockerfile for Task API
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Use non-root user for security
USER node

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start command
CMD ["node", "src/app.js"]
