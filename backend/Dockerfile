FROM node:20-alpine
WORKDIR /app

# Install Python 3 and build tools for node-gyp and native modules
RUN apk add --no-cache python3 make g++ bash

# Copy package files first for better caching
COPY package*.json ./

# Clear npm cache and install dependencies with verbose output
RUN npm cache clean --force && \
    npm install --verbose --production=false

# Copy the rest of the application
COPY . .

# Verify that lru-cache is installed
RUN npm list lru-cache

EXPOSE 8000
ENV PORT=8000
CMD [ "node", "server.js" ] 