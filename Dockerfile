FROM node:18-slim

# 1. تثبيت تعريفات المتصفح اللازمة للعمل على لينكس
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 2. إعداد مسار المتصفح لـ Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# 3. تثبيت المكتبات
COPY package*.json ./
RUN npm install

# 4. نسخ الملفات
COPY . .

# 5. التوافق مع بورت Hugging Face (إلزامي 7860)
ENV PORT=7860
EXPOSE 7860

CMD ["node", "server.js"]