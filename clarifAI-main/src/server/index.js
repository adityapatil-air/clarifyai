import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { grammarCorrection } from './lib/hf.js';
import { labelNormalization } from './lib/hf.js';
import { zeroShotValidation } from './lib/hf.js';
import { paraphraseAugmentation } from './lib/hf.js';

// Load environment variables
dotenv.config();

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

// Grammar correction endpoint
app.post('/api/clean/grammar', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        error: 'Text is required',
        success: false 
      });
    }

    const result = await grammarCorrection(text);
    res.json({
      success: true,
      original: text,
      corrected: result,
      model: 'prithivida/grammar_error_correcter_v1'
    });
  } catch (error) {
    console.error('Grammar correction error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Grammar correction failed',
      original: req.body.text
    });
  }
});

// Label normalization endpoint
app.post('/api/clean/normalize', async (req, res) => {
  try {
    const { labels, referenceLabels } = req.body;
    
    if (!labels || !Array.isArray(labels)) {
      return res.status(400).json({ 
        error: 'Labels array is required',
        success: false 
      });
    }

    const result = await labelNormalization(labels, referenceLabels);
    res.json({
      success: true,
      original: labels,
      normalized: result,
      model: 'sentence-transformers/all-MiniLM-L6-v2'
    });
  } catch (error) {
    console.error('Label normalization error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Label normalization failed',
      original: req.body.labels
    });
  }
});

// Zero-shot validation endpoint
app.post('/api/clean/validate', async (req, res) => {
  try {
    const { text, candidateLabels } = req.body;
    
    if (!text || !candidateLabels || !Array.isArray(candidateLabels)) {
      return res.status(400).json({ 
        error: 'Text and candidateLabels array are required',
        success: false 
      });
    }

    const result = await zeroShotValidation(text, candidateLabels);
    res.json({
      success: true,
      text,
      candidateLabels,
      validation: result,
      model: 'facebook/bart-large-mnli'
    });
  } catch (error) {
    console.error('Zero-shot validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Zero-shot validation failed',
      text: req.body.text,
      candidateLabels: req.body.candidateLabels
    });
  }
});

// Paraphrase augmentation endpoint
app.post('/api/clean/augment', async (req, res) => {
  try {
    const { text, numVariations = 3 } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        error: 'Text is required',
        success: false 
      });
    }

    const result = await paraphraseAugmentation(text, numVariations);
    res.json({
      success: true,
      original: text,
      variations: result,
      model: 'Vamsi/T5_Paraphrase_Paws'
    });
  } catch (error) {
    console.error('Paraphrase augmentation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Paraphrase augmentation failed',
      original: req.body.text
    });
  }
});

// Batch processing endpoint for all operations
app.post('/api/clean/batch', async (req, res) => {
  try {
    const { data, operations } = req.body;
    
    if (!data || !Array.isArray(data) || !operations) {
      return res.status(400).json({ 
        error: 'Data array and operations object are required',
        success: false 
      });
    }

    const results = {
      grammar: { success: false, results: [], error: null },
      normalize: { success: false, results: [], error: null },
      validate: { success: false, results: [], error: null },
      augment: { success: false, results: [], error: null }
    };

    // Process each operation independently
    if (operations.grammar) {
      try {
        const grammarResults = await Promise.allSettled(
          data.map(item => grammarCorrection(item.text || item))
        );
        results.grammar.success = true;
        results.grammar.results = grammarResults.map((result, index) => ({
          original: data[index],
          corrected: result.status === 'fulfilled' ? result.value : null,
          success: result.status === 'fulfilled'
        }));
      } catch (error) {
        results.grammar.error = error.message;
      }
    }

    if (operations.normalize && operations.referenceLabels) {
      try {
        const labels = data.map(item => item.label || item);
        const normalizedResults = await labelNormalization(labels, operations.referenceLabels);
        results.normalize.success = true;
        results.normalize.results = normalizedResults;
      } catch (error) {
        results.normalize.error = error.message;
      }
    }

    if (operations.validate && operations.candidateLabels) {
      try {
        const validationResults = await Promise.allSettled(
          data.map(item => zeroShotValidation(item.text || item, operations.candidateLabels))
        );
        results.validate.success = true;
        results.validate.results = validationResults.map((result, index) => ({
          text: data[index],
          validation: result.status === 'fulfilled' ? result.value : null,
          success: result.status === 'fulfilled'
        }));
      } catch (error) {
        results.validate.error = error.message;
      }
    }

    if (operations.augment) {
      try {
        const augmentResults = await Promise.allSettled(
          data.map(item => paraphraseAugmentation(item.text || item, operations.numVariations || 3))
        );
        results.augment.success = true;
        results.augment.results = augmentResults.map((result, index) => ({
          original: data[index],
          variations: result.status === 'fulfilled' ? result.value : null,
          success: result.status === 'fulfilled'
        }));
      } catch (error) {
        results.augment.error = error.message;
      }
    }

    res.json({
      success: true,
      results,
      summary: {
        totalItems: data.length,
        operationsRequested: Object.keys(operations).length,
        operationsCompleted: Object.values(results).filter(r => r.success).length
      }
    });

  } catch (error) {
    console.error('Batch processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Batch processing failed'
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
  console.log(`   POST /api/clean/grammar`);
  console.log(`   POST /api/clean/normalize`);
  console.log(`   POST /api/clean/validate`);
  console.log(`   POST /api/clean/augment`);
  console.log(`   POST /api/clean/batch`);
}); 