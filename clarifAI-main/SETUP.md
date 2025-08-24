# AI Data Resolution Backend Setup Guide

This guide will help you set up the AI-powered data resolution backend with Hugging Face models.

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create environment file**
   ```bash
   # Create .env file in the root directory
   echo "HF_TOKEN=hf_your_token_here" > .env
   echo "PORT=3001" >> .env
   echo "NODE_ENV=development" >> .env
   ```

3. **Get your Hugging Face token**
   - Go to [Hugging Face Settings](https://huggingface.co/settings/tokens)
   - Create a new token with "Read" permissions
   - Replace `hf_your_token_here` in your `.env` file

4. **Start the servers**
   ```bash
   # Run both frontend and backend
   npm run dev:full
   
   # Or run them separately:
   # Terminal 1: Backend
   npm run dev:server
   # Terminal 2: Frontend  
   npm run dev
   ```

5. **Test the API**
   ```bash
   node test-api.js
   ```

## API Endpoints

### Health Check
```bash
GET http://localhost:3001/api/health
```

### Grammar Correction
```bash
POST http://localhost:3001/api/clean/grammar
Content-Type: application/json

{
  "text": "This sentence has grammer errors."
}
```

### Label Normalization
```bash
POST http://localhost:3001/api/clean/normalize
Content-Type: application/json

{
  "labels": ["good", "bad", "okay"],
  "referenceLabels": ["positive", "negative", "neutral"]
}
```

### Zero-shot Validation
```bash
POST http://localhost:3001/api/clean/validate
Content-Type: application/json

{
  "text": "This is a valid data entry.",
  "candidateLabels": ["valid", "invalid", "uncertain"]
}
```

### Paraphrase Augmentation
```bash
POST http://localhost:3001/api/clean/augment
Content-Type: application/json

{
  "text": "This is a sample text for augmentation.",
  "numVariations": 3
}
```

### Batch Processing
```bash
POST http://localhost:3001/api/clean/batch
Content-Type: application/json

{
  "data": [
    {"text": "Sample text 1"},
    {"text": "Sample text 2"}
  ],
  "operations": {
    "grammar": true,
    "normalize": true,
    "validate": true,
    "augment": true,
    "referenceLabels": ["positive", "negative"],
    "candidateLabels": ["valid", "invalid"],
    "numVariations": 2
  }
}
```

## Hugging Face Models Used

| Model ID | Purpose | Endpoint |
|----------|---------|----------|
| `prithivida/grammar_error_correcter_v1` | Grammar correction | `/api/clean/grammar` |
| `sentence-transformers/all-MiniLM-L6-v2` | Label normalization | `/api/clean/normalize` |
| `facebook/bart-large-mnli` | Zero-shot validation | `/api/clean/validate` |
| `Vamsi/T5_Paraphrase_Paws` | Paraphrase augmentation | `/api/clean/augment` |

## Error Handling

The backend is designed to be robust:
- If a model fails, the original data is preserved
- Processing continues with other models
- Detailed error messages are returned
- Rate limiting is handled with delays between requests

## Troubleshooting

### Common Issues

1. **"HF_TOKEN environment variable is required"**
   - Make sure your `.env` file exists and contains the token
   - Verify the token is valid at https://huggingface.co/settings/tokens

2. **"Model loading" errors**
   - Models may take time to load on first use
   - Check your internet connection
   - Some models require specific Hugging Face plan

3. **Rate limiting**
   - The app includes delays between API calls
   - Consider upgrading your Hugging Face plan

4. **CORS errors**
   - Backend is configured with CORS enabled
   - Frontend should be accessed through the proxy at port 8080

### Testing

Run the test script to verify all endpoints:
```bash
node test-api.js
```

### Logs

Check the server logs for detailed error information:
```bash
npm run dev:server
```

## Development

### Adding New Models

1. Add model ID to `src/server/lib/hf.js`
2. Create processing function
3. Add endpoint in `src/server/index.js`
4. Update frontend component

### Environment Variables

- `HF_TOKEN`: Hugging Face API token (required)
- `PORT`: Backend port (default: 3001)
- `NODE_ENV`: Environment mode

### File Structure

```
src/server/
├── index.js          # Express server
└── lib/
    └── hf.js         # Hugging Face API client
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up proper CORS for your domain
4. Use environment variables for configuration
5. Set up monitoring and logging

## Support

- Check the browser console for frontend errors
- Check server logs for backend errors
- Verify Hugging Face token permissions
- Test individual endpoints with the test script 