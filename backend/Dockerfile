FROM node:22-alpine

# Needed so the TZ variable (Africa/Cairo) works inside the container
RUN apk add --no-cache tzdata

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "start"]