# PDF OCR Service

A service to create searchable PDFs from regular PDFs using Google Cloud Vision OCR.

## Prerequisites

- Node.js 18+ and PNPM
- Google Cloud Vision API key
- A PostgreSQL database (e.g., Neon)
- Blob storage solution for storing processed PDFs

## Environment Variables

Create a `.env` file based on `.env.example`:

```
# Server settings
PORT=8080

# Database settings
DATABASE_URL=postgresql://user:password@db.example.com:5432/dbname

# Google Cloud Vision API key
GOOGLE_API_KEY=your_google_api_key_here

# Optional: Blob storage token if you use a service like Vercel Blob
BLOB_READ_WRITE_TOKEN=your_blob_read_write_token
```

## Installation and Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Building for Production

```bash
# Build TypeScript sources
pnpm build

# Start production server
pnpm start
```

## Usage

The service exposes an API endpoint that accepts PDF IDs and processes them with OCR.

### API Endpoint

```
POST /api/ocr
```

Request body:

```json
{
  "pdfId": 123
}
```

Response:

```json
{
  "success": true,
  "message": "PDF processed successfully",
  "searchableUrl": "https://yourblobstorage.com/path/to/searchable.pdf",
  "processingTimeMs": 12345,
  "pageCount": 5
}
```

## Deploying to Fly.io

1. Install the Fly.io CLI:

   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. Login to Fly.io:

   ```bash
   fly auth login
   ```

3. Launch the app:

   ```bash
   fly launch
   ```

4. Set secrets (replace with your actual values):

   ```bash
   fly secrets set DATABASE_URL="postgresql://user:password@db.example.com:5432/dbname" \
   GOOGLE_API_KEY="your_google_api_key_here" \
   BLOB_READ_WRITE_TOKEN="your_blob_token"
   ```

5. Deploy:
   ```bash
   fly deploy
   ```

## Integration with Your Application

To integrate this service with your application, you can make HTTP requests to the OCR endpoint:

```javascript
async function ocrPdf(pdfId) {
  const response = await fetch("https://your-fly-app.fly.dev/api/ocr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pdfId }),
  });

  return response.json();
}
```

## Notes on Scaling

For processing large PDFs or handling many concurrent requests, consider:

1. Increasing the VM size in `fly.toml`
2. Implementing a queue system for processing PDFs asynchronously
3. Setting up multiple instances for horizontal scaling
