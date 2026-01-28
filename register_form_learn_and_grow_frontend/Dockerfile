# Dockerfile for port 4173
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Expose the container port (4173)
EXPOSE 3000

# Serve on port 4173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]