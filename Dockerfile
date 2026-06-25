# Stage 1: Build both frontend and backend
FROM node:18-alpine AS builder
WORKDIR /app

# Copy root workspace and package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies (workspaces will link automatically)
RUN npm ci

# Copy the rest of the application files
COPY frontend/ ./frontend/
COPY backend/ ./backend/

# Build both frontend and backend
RUN npm run build --workspace=frontend
RUN npm run build --workspace=backend

# Stage 2: Clean production runner
FROM node:18-alpine
WORKDIR /app

# Copy root configuration and backend package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install only production dependencies for the backend
RUN npm ci --omit=dev --workspace=backend

# Copy built backend files
COPY --from=builder /app/backend/dist ./backend/dist

# Copy built frontend static files
COPY --from=builder /app/frontend/dist ./frontend/dist

# Create uploads directory
RUN mkdir -p backend/uploads

# Expose port (Google Cloud Run binds to PORT env dynamically)
ENV PORT=8080
EXPOSE 8080

# Run backend starting from the root folder
CMD ["node", "backend/dist/index.js"]
