# WhatsApp Web bridge — runs whatsapp-web.js (Puppeteer/Chromium) 24/7
FROM node:20-bullseye-slim

# Chromium dependencies for Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates fonts-liberation libappindicator3-1 libasound2 \
    libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
    libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 \
    libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
    libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
    lsb-release wget xdg-utils \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    SESSION_PATH=/data/wweb-session \
    PORT=3000

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./

# Persist auth across restarts (mount a volume on /data)
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "server.js"]
