# AI-Powered Data Resolution

A modern web application that uses Hugging Face AI models to clean, validate, and enhance your data automatically.

## Features

- **Grammar Correction**: Fix typos and grammatical errors using `prithivida/grammar_error_correcter_v1`
- **Label Normalization**: Standardize labels using embeddings from `sentence-transformers/all-MiniLM-L6-v2`
- **Zero-shot Validation**: Validate data quality using `facebook/bart-large-mnli`
- **Data Augmentation**: Generate variations using `Vamsi/T5_Paraphrase_Paws`
- **Robust Error Handling**: Continue processing even if individual models fail
- **Real-time Progress**: Visual feedback during AI processing
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Hugging Face API token

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd clarifAI-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Hugging Face API Token (required)
   HF_TOKEN=hf_your_token_here
   
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   ```

   **Important**: Get your Hugging Face token from [Hugging Face Settings](https://huggingface.co/settings/tokens)

4. **Start the development servers**

   **Option A: Run both frontend and backend together**
   ```bash
   npm run dev:full
   ```

   **Option B: Run them separately**
   ```bash
   # Terminal 1 - Backend API server
   npm run dev:server
   
   # Terminal 2 - Frontend development server
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3001
   - Health check: http://localhost:3001/api/health

## API Endpoints

### Individual Operations

- `POST /api/clean/grammar` - Grammar correction
- `POST /api/clean/normalize` - Label normalization
- `POST /api/clean/validate` - Zero-shot validation
- `POST /api/clean/augment` - Paraphrase augmentation

### Batch Processing

- `POST /api/clean/batch` - Process all operations at once

### Health Check

- `GET /api/health` - API status

## Usage

1. **Upload your data file** (CSV, JSON, or TXT)
2. **Review the data preview** to see identified issues
3. **Click "Start AI Resolution"** to begin processing
4. **Monitor progress** as each AI model processes your data
5. **Download the cleaned data** when processing is complete

## AI Models Used

| Operation | Model | Endpoint |
|-----------|-------|----------|
| Grammar Correction | `prithivida/grammar_error_correcter_v1` | `/api/clean/grammar` |
| Label Normalization | `sentence-transformers/all-MiniLM-L6-v2` | `/api/clean/normalize` |
| Zero-shot Validation | `facebook/bart-large-mnli` | `/api/clean/validate` |
| Paraphrase Augmentation | `Vamsi/T5_Paraphrase_Paws` | `/api/clean/augment` |

## Error Handling

The application is designed to be robust:
- If one model fails, processing continues with other models
- Original data is preserved as fallback
- Detailed error messages are shown for each step
- Progress is saved even if some operations fail

## Development

### Project Structure

```
src/
├── components/          # React components
│   ├── ErrorResolution.tsx  # Main AI processing component
│   ├── FileUpload.tsx       # File upload handling
│   └── ui/              # UI components (shadcn/ui)
├── server/             # Backend API
│   ├── index.js        # Express server
│   └── lib/
│       └── hf.js       # Hugging Face API client
└── pages/              # Page components
```

### Adding New Models

1. Add the model ID to `src/server/lib/hf.js`
2. Create a new function for the model
3. Add an endpoint in `src/server/index.js`
4. Update the frontend to use the new endpoint

### Environment Variables

- `HF_TOKEN`: Your Hugging Face API token (required)
- `PORT`: Backend server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)

## Troubleshooting

### Common Issues

1. **"HF_TOKEN environment variable is required"**
   - Make sure you've created a `.env` file with your Hugging Face token
   - Verify the token is valid and has the necessary permissions

2. **"Model loading" errors**
   - Some models may take time to load on first use
   - Check your internet connection
   - Verify the model IDs are correct

3. **Rate limiting errors**
   - The application includes delays between API calls
   - Consider upgrading your Hugging Face plan for higher rate limits

4. **CORS errors**
   - The backend is configured with CORS enabled
   - Make sure you're accessing the frontend through the correct port

### Getting Help

- Check the browser console for detailed error messages
- Verify your Hugging Face token is valid
- Ensure all dependencies are installed correctly

## License

This project is licensed under the MIT License.
