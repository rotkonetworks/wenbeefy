# Use an official Node runtime as a parent image
FROM node:latest

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install any needed packages
RUN npm install

# Copy the rest of your app's source code
COPY . .

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Run npm run dev when the container launches
CMD ["npm", "run", "dev"]
