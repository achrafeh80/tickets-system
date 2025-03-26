# Dockerfile - Notification Service
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy service files
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose the service port
EXPOSE 3004

# Start the service
CMD ["node", "app.js"]