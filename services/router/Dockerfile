# Node router example
FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV PORT=3032
EXPOSE 3032

# Your start script should use PORT and serve /health
CMD ["npm", "start"]
