# Use the official Playwright image which comes with all necessary system dependencies
FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including Playwright browsers)
# Using npm install instead of npm ci to handle platform-specific dependencies
# that may not be in the Windows-generated lockfile
RUN npm install --omit=dev

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start"]
