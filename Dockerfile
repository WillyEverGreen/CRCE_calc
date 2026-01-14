# Use the official Playwright image which comes with all necessary system dependencies
FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including Playwright browsers)
# We don't need 'npx playwright install' separately because the base image has them, 
# but ensuring 'playwright' package is installed is key.
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start"]
