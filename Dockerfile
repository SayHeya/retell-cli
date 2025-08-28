# Dockerfile for Retell AI CLI Development Environment
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Make scripts executable
RUN chmod +x index.js dev-server.js *.sh

# Create directories for data persistence
RUN mkdir -p logs templates config public

# Set up non-root user for security
RUN addgroup -g 1001 -S retell && \
    adduser -S retell -u 1001 -G retell

# Change ownership of app directory
RUN chown -R retell:retell /app

USER retell

# Expose development server port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Default command
CMD ["node", "dev-server.js"]

---

# docker-compose.yml
version: '3.8'

services:
  retell-dev:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
    env_file:
      - .env
    volumes:
      # Mount local directories for development
      - ./logs:/app/logs
      - ./templates:/app/templates  
      - ./config:/app/config
      # Mount source code for hot reloading in development
      - .:/app:delegated
      - /app/node_modules
    networks:
      - retell-network
    restart: unless-stopped
    command: ["npm", "run", "dev"]

  # Optional: Redis for caching and session storage
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - retell-network
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]

  # Optional: Webhook receiver for testing
  webhook-receiver:
    image: node:18-alpine
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
    networks:
      - retell-network
    volumes:
      - ./webhook-receiver:/app
    working_dir: /app
    command: ["node", "server.js"]
    restart: unless-stopped

  # Optional: ngrok for webhook tunneling
  ngrok:
    image: ngrok/ngrok:latest
    ports:
      - "4040:4040"  # ngrok web interface
    environment:
      - NGROK_AUTHTOKEN=${NGROK_AUTHTOKEN}
    command: ["http", "webhook-receiver:3001"]
    networks:
      - retell-network
    depends_on:
      - webhook-receiver

volumes:
  redis_data:

networks:
  retell-network:
    driver: bridge

---

# docker-compose.dev.yml - Development override
version: '3.8'

services:
  retell-dev:
    build: 
      context: .
      target: development
    volumes:
      - .:/app:delegated
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DEBUG=retell:*
    command: ["npm", "run", "dev"]

---

# .dockerignore
node_modules
npm-debug.log*
.git
.gitignore
README.md
.env
.retellrc.json
logs/
*.log
coverage/
.nyc_output
.tmp
.temp
backup-*/

---

# Development Dockerfile stage
FROM node:18-alpine AS development

WORKDIR /app

# Install development dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git \
    vim \
    && rm -rf /var/cache/apk/*

# Install nodemon globally for development
RUN npm install -g nodemon

COPY package*.json ./
RUN npm ci

COPY . .
RUN chmod +x *.js *.sh

USER node

EXPOSE 3000

CMD ["npm", "run", "dev"]