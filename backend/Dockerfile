# Use an official Node.js runtime as a parent image
# We're using Node.js 18, as specified in your package.json "engines"
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Set environment variable for production
ENV NODE_ENV=production

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies using npm ci for reproducible builds
RUN npm ci --only=production

# Copy the rest of your application's code to the working directory
COPY . .

# Your app listens on port 3001, so we'll expose it
EXPOSE 3001

# The command to run your app
CMD ["node", "server.js"] 