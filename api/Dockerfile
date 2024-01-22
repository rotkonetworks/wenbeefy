# Use an Alpine-based Node image
FROM node:20.11.0-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of your app's source code
COPY . .

# Expose the port your app runs on
EXPOSE 4000

# Set environment variables
ENV NODE_ENV production

# Command to run your app
CMD ["node", "api.js"]
