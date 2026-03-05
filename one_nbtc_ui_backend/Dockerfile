FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
COPY .env ./

EXPOSE 5001

CMD ["node", "server.js"]