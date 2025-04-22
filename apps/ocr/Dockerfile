FROM node:20-slim

# Install necessary dependencies for PDF processing and native Node modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Required for compiling native Node.js modules (e.g., @napi-rs/canvas)
    build-essential \
    # Vector graphics library, dependency for @napi-rs/canvas and potentially pdfkit
    libcairo2-dev \
    # Library for layout and rendering of text, dependency for @napi-rs/canvas
    libpango1.0-dev \
    # Library for JPEG image handling, dependency for @napi-rs/canvas
    libjpeg-dev \
    # Library for GIF image handling, dependency for @napi-rs/canvas
    libgif-dev \
    # Library for SVG rendering, dependency for @napi-rs/canvas
    librsvg2-dev \
    # Pixel manipulation library, dependency for cairo
    libpixman-1-dev \
    # Library for PNG image handling, dependency for @napi-rs/canvas
    libpng-dev \
    # Provides pdfinfo (for page count) and pdftoppm (for PDF to image conversion)
    poppler-utils \
    # Helper tool used for compiling and linking against libraries
    pkg-config \
    # Provides root CA certificates for verifying SSL connections (e.g., for sentry-cli)
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# No need for separate install of poppler-utils, it's included above
# RUN apt-get update && apt-get install -y \
#     poppler-utils \
#     && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy application code
COPY . .

# Build TypeScript
RUN pnpm build

# Expose port for the application
EXPOSE 8080

# Start the application
CMD ["pnpm", "start"] 