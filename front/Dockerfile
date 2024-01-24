# Stage 1: Building the Node.js app
FROM node:21-alpine as builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your app's source code
COPY . .

# Build your app
RUN npm run build

# Final Stage: Running the Nitro server
FROM node:21-alpine

# Set the working directory
WORKDIR /app

# Copy the built app from the builder stage
COPY --from=builder /app/.output /app

# Expose the port the app runs on
EXPOSE 3000

# Run the Nitro server
CMD ["node", "./server/index.mjs"]
