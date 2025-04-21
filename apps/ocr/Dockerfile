FROM node:20-slim

# Install dependencies for PDF processing
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    libcairo2-dev \
    poppler-utils \
    pkg-config \
    ghostscript \
    pdftk \
    poppler-utils \
    libpng-dev \
    libjpeg-dev \
    imagemagick \
    libpixman-1-dev \
    libpango1.0-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Install pdfinfo (required for page count)
RUN apt-get update && apt-get install -y \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port for the application
EXPOSE 8080

# Start the application
CMD ["npm", "start"] 