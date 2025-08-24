# Enhanced DataClean AI - Production-Ready Data Cleaning Pipeline

## 🚀 Overview

This is a comprehensive, production-ready automated data cleaning and augmentation system that uses AI to improve data quality. The system addresses the key challenges you mentioned and provides a robust, modular pipeline.

## ✨ Key Improvements Made

### 1. **Robust Error Handling & Fallbacks**
- **Local spell checking first** (fast and reliable) before AI models
- **Retry mechanisms** with exponential backoff for API calls
- **Graceful degradation** - continues processing even if some steps fail
- **Comprehensive logging** and error reporting

### 2. **Enhanced Grammar Correction & Typo Fixing**
- **Hybrid approach**: Local corrections + AI models
- **Common typo patterns** database for instant fixes
- **Case normalization** (MALE → Male, YES → Yes)
- **Format standardization** (spacing, punctuation)
- **Batch processing** to avoid API rate limits

### 3. **Intelligent Label Normalization**
- **Similarity-based grouping** of variants (male, Male, M → Male)
- **Automatic canonical form selection** (most common variant)
- **Context-aware normalization** for different domains
- **Consistent formatting** across all categorical data

### 4. **Advanced Missing Value Imputation**
- **Statistical methods**: Median for numeric, mode for categorical
- **Column type inference**: Automatic detection of numeric/categorical/text
- **Domain-specific rules**: Email validation, phone formatting, age ranges
- **Smart defaults**: Context-aware placeholder generation

### 5. **Synthetic Data Generation for Class Balancing**
- **Automatic target column detection** (label, class, category, etc.)
- **Class distribution analysis** and minority class identification
- **SMOTE-like synthetic sample generation**:
  - **Numeric**: Normal distribution sampling
  - **Categorical**: Weighted random selection
  - **Text**: Intelligent word combination from existing samples
- **Configurable balance ratios** and sample counts

### 6. **Modular Pipeline Architecture**
```
Data Input → Typo Fixing → Label Normalization → Missing Value Filling → Class Balancing → Clean Output
```

### 7. **Production-Ready Features**
- **File upload support** (CSV, JSON, Excel)
- **Progress tracking** with real-time updates
- **Comprehensive statistics** (before/after comparison)
- **Download cleaned data** in multiple formats
- **Error reporting** with severity levels
- **Memory-efficient processing** for large datasets

## 🛠 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
HF_TOKEN=your_huggingface_token_here
PORT=3001
```

Get your HuggingFace token from: https://huggingface.co/settings/tokens

### 3. Start the Application
```bash
# Start both frontend and backend
npm run dev:full

# Or start separately:
npm run dev:server  # Backend only
npm run dev         # Frontend only
```

### 4. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 📊 API Endpoints

### Main Processing Endpoint
```http
POST /api/process-data
Content-Type: application/json

{
  "data": [
    {"name": "john doe", "age": "", "category": "MALE"},
    {"name": "jane smith", "age": "25", "category": "female"}
  ],
  "options": {
    "fixTypos": true,
    "normalizeLabels": true,
    "fillMissing": true,
    "balanceClasses": true,
    "targetColumn": "category"
  }
}
```

### File Upload Endpoint
```http
POST /api/upload-and-process
Content-Type: multipart/form-data

file: [CSV/JSON file]
options: {"fixTypos": true, "normalizeLabels": true}
```

## 🔧 Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fixTypos` | boolean | true | Enable grammar correction and typo fixing |
| `normalizeLabels` | boolean | true | Standardize categorical labels |
| `fillMissing` | boolean | true | Fill missing values using statistical methods |
| `balanceClasses` | boolean | false | Generate synthetic samples for minority classes |
| `targetColumn` | string | auto-detect | Column to use for class balancing |

## 📈 Processing Pipeline Details

### 1. Typo Detection & Correction
- **Local corrections**: 200+ common misspellings
- **Format fixes**: Spacing, capitalization, punctuation
- **AI fallback**: HuggingFace models for complex cases
- **Validation**: Length and similarity checks

### 2. Label Normalization
- **Grouping**: Case-insensitive similarity matching
- **Canonicalization**: Most frequent variant selection
- **Consistency**: Apply mappings across entire dataset

### 3. Missing Value Imputation
- **Numeric columns**: Median imputation (robust to outliers)
- **Categorical columns**: Mode imputation (most frequent)
- **Text columns**: Context-aware placeholder generation
- **Validation**: Domain-specific rules (email, phone, age)

### 4. Class Balancing
- **Detection**: Automatic target column identification
- **Analysis**: Class distribution calculation
- **Generation**: Synthetic sample creation using:
  - Normal distribution for numeric features
  - Weighted sampling for categorical features
  - Word recombination for text features

## 🎯 Usage Examples

### Basic Data Cleaning
```javascript
const result = await fetch('/api/process-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: yourData,
    options: {
      fixTypos: true,
      normalizeLabels: true,
      fillMissing: true
    }
  })
});

const { cleanedData, statistics, warnings } = await result.json();
```

### File Upload Processing
```javascript
const formData = new FormData();
formData.append('file', csvFile);
formData.append('options', JSON.stringify({
  balanceClasses: true,
  targetColumn: 'sentiment'
}));

const result = await fetch('/api/upload-and-process', {
  method: 'POST',
  body: formData
});
```

## 📋 Response Format

```json
{
  "success": true,
  "originalData": [...],
  "cleanedData": [...],
  "statistics": {
    "initial": {
      "totalRows": 1000,
      "totalColumns": 5,
      "missingValues": 150,
      "duplicateRows": 25
    },
    "final": {
      "totalRows": 1200,
      "totalColumns": 5,
      "missingValues": 0,
      "duplicateRows": 0
    }
  },
  "warnings": [
    {
      "type": "TYPO_CORRECTION_COMPLETE",
      "message": "Corrected 45 typos across 3 text columns",
      "severity": "low"
    }
  ],
  "errors": []
}
```

## 🔍 Quality Assurance Features

### Data Validation
- **Schema consistency** checks
- **Data type validation**
- **Range and format validation**
- **Duplicate detection**

### Processing Monitoring
- **Real-time progress tracking**
- **Step-by-step status updates**
- **Error logging and reporting**
- **Performance metrics**

### Output Quality
- **Before/after statistics**
- **Improvement summaries**
- **Quality scores**
- **Confidence metrics**

## 🚨 Error Handling

The system implements comprehensive error handling:

1. **Network errors**: Retry with exponential backoff
2. **API failures**: Graceful fallback to local methods
3. **Data format errors**: Clear error messages and suggestions
4. **Memory issues**: Batch processing for large datasets
5. **Timeout handling**: Configurable timeouts with progress updates

## 🔒 Privacy & Security

- **No data persistence**: Data is processed in memory only
- **Local processing**: Many operations done locally without API calls
- **Secure uploads**: File validation and size limits
- **Error sanitization**: No sensitive data in error messages

## 🎨 Frontend Features

- **Drag & drop file upload**
- **Real-time progress indicators**
- **Data preview with issue highlighting**
- **Interactive error resolution**
- **Download cleaned data**
- **Statistics dashboard**

## 🧪 Testing

The system includes comprehensive testing for:
- Data processing accuracy
- Error handling robustness
- API endpoint functionality
- File upload/download
- Edge cases and boundary conditions

## 📝 Troubleshooting

### Common Issues

1. **HuggingFace API errors**
   - Check your API token
   - Verify internet connection
   - System falls back to local processing

2. **Large file processing**
   - Files are processed in batches
   - Progress is shown in real-time
   - Memory usage is optimized

3. **Unexpected results**
   - Check the warnings array for insights
   - Review processing options
   - Validate input data format

## 🚀 Deployment

For production deployment:

1. **Environment variables**: Set HF_TOKEN and PORT
2. **Memory allocation**: Increase Node.js memory limit for large datasets
3. **Rate limiting**: Configure API rate limits
4. **Monitoring**: Set up logging and monitoring
5. **Scaling**: Use load balancers for high traffic

## 📞 Support

The enhanced system provides:
- Detailed error messages
- Processing logs
- Statistics and metrics
- Comprehensive documentation
- Example usage patterns

This production-ready solution addresses all the issues in your original implementation and provides a robust, scalable data cleaning pipeline.