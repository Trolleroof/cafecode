FROM node:20-alpine
WORKDIR /app

# Install Python 3 and build tools for node-gyp and native modules
RUN apk add --no-cache python3 make g++ bash

COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8000
ENV PORT=8000
CMD [ "node", "server.js" ] 