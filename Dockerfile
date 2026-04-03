FROM python:3.12-slim

WORKDIR /app

# Install system deps for lxml + Playwright/Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libxml2 libxslt1.1 \
    # Playwright Chromium dependencies
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
    libcairo2 libasound2 libatspi2.0-0 libwayland-client0 \
    fonts-liberation wget \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements-cloud.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright + Chromium
RUN pip install playwright && playwright install chromium

COPY . .

# Create data directory for persistent cookies/config
RUN mkdir -p /app/data

EXPOSE 5000

CMD ["gunicorn", "webapp:app", "--bind", "0.0.0.0:5000", "--workers", "1", "--threads", "4", "--timeout", "300", "--preload"]
