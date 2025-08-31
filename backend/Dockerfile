FROM node:20-alpine
WORKDIR /app

# Install Python 3 and build tools for node-gyp and native modules
RUN apk add --no-cache python3 make g++ bash git

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --production=false

# Copy the rest of the application
COPY . .

# Verify critical dependencies are installed
RUN npm list redis && \
    npm list express && \
    echo "Dependencies verified successfully"

EXPOSE 8000
ENV PORT=8000
CMD [ "node", "server.js" ] 