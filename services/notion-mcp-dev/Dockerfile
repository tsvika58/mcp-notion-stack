FROM node:20-alpine

# Add curl for health checks & debugging
RUN apk add --no-cache curl

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

ENV PORT=3031
EXPOSE 3031

CMD ["node", "dist/index.js"]
