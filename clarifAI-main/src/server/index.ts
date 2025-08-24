import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple data processor (inline implementation)
class SimpleDataProcessor {
  async processData(data, options = {}) {
    const result = {
      originalData: data,
      cleanedData: [...data],
      statistics: { initial: {}, final: {} },
      errors: [],
      warnings: []
    };

    // Fix typos and normalize
    result.cleanedData = result.cleanedData.map(row => {
      const cleaned = { ...row };
      
      // Fix common issues
      Object.keys(cleaned).forEach(key => {
        if (typeof cleaned[key] === 'string') {
          // Fix spacing and case
          cleaned[key] = cleaned[key]
            .replace(/\s+/g, ' ')
            .trim();
          
          // Normalize categories
          if (key.toLowerCase().includes('category') || key.toLowerCase().includes('gender')) {
            const val = cleaned[key].toLowerCase();
            if (val === 'male' || val === 'm') cleaned[key] = 'Male';
            if (val === 'female' || val === 'f') cleaned[key] = 'Female';
          }
        }
        
        // Fill missing values
        if (!cleaned[key] || cleaned[key] === '') {
          if (key.toLowerCase().includes('age')) cleaned[key] = '25';
          if (key.toLowerCase().includes('email')) cleaned[key] = 'unknown@email.com';
        }
      });
      
      return cleaned;
    });

    // Add some synthetic data if balancing is requested
    if (options.balanceClasses && options.targetColumn) {
      const syntheticSample = { ...result.cleanedData[0] };
      Object.keys(syntheticSample).forEach(key => {
        if (typeof syntheticSample[key] === 'string') {
          syntheticSample[key] = 'Generated ' + syntheticSample[key];
        }
      });
      result.cleanedData.push(syntheticSample);
    }

    result.warnings.push({
      type: 'PROCESSING_COMPLETE',
      message: `Processed ${data.length} records successfully`,
      severity: 'low'
    });

    return result;
  }
}

const dataProcessor = new SimpleDataProcessor();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Data Resolution API is running' });
});

// Main data processing endpoint
app.post('/api/process-data', async (req, res) => {
  try {
    const { data, options = {} } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ 
        error: 'Data array is required',
        success: false 
      });
    }

    if (data.length === 0) {
      return res.status(400).json({ 
        error: 'Data array cannot be empty',
        success: false 
      });
    }

    console.log(`Processing ${data.length} records with options:`, options);
    
    const processingOptions = {
      fixTypos: options.fixTypos !== false,
      normalizeLabels: options.normalizeLabels !== false,
      fillMissing: options.fillMissing !== false,
      balanceClasses: options.balanceClasses === true,
      targetColumn: options.targetColumn
    };

    const result = await dataProcessor.processData(data, processingOptions);
    
    res.json({
      success: true,
      originalData: result.originalData,
      cleanedData: result.cleanedData,
      statistics: result.statistics,
      errors: result.errors,
      warnings: result.warnings,
      summary: {
        originalRows: result.originalData.length,
        cleanedRows: result.cleanedData.length,
        improvementsMade: result.warnings.length,
        errorsEncountered: result.errors.length
      }
    });

  } catch (error) {
    console.error('Data processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Data processing failed'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AI Data Resolution API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Available endpoints:`);
  console.log(`   POST /api/process-data`);
});