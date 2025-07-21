# Use an official Node.js runtime as a parent image
# We're using Node.js 18, as specified in your package.json "engines"
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install production dependencies
# Using --production flag ensures devDependencies are not installed
RUN npm install --production

# Copy the rest of your application's code to the working directory
COPY . .

# Your app listens on port 3001, so we'll expose it
EXPOSE 3001

# The command to run your app
CMD ["node", "server.js"] 