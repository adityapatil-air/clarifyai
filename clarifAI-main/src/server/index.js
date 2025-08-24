import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Enhanced data processor with validation and augmentation
class EnhancedDataProcessor {
  async processData(data, options = {}) {
    const result = {
      originalData: data,
      cleanedData: [...data],
      validationReport: [],
      augmentationReport: [],
      statistics: { initial: {}, final: {} },
      errors: [],
      warnings: []
    };

    // Step 1: Data Cleaning
    result.cleanedData = result.cleanedData.map((row, index) => {
      const cleaned = { ...row };
      
      Object.keys(cleaned).forEach(key => {
        if (typeof cleaned[key] === 'string') {
          // Fix spacing and case
          const original = cleaned[key];
          cleaned[key] = cleaned[key].replace(/\s+/g, ' ').trim();
          
          if (original !== cleaned[key]) {
            result.warnings.push({
              type: 'TEXT_CLEANED',
              message: `Row ${index + 1}, ${key}: Fixed spacing`,
              severity: 'low'
            });
          }
          
          // Normalize categories
          if (key.toLowerCase().includes('category') || key.toLowerCase().includes('gender')) {
            const val = cleaned[key].toLowerCase();
            if (val === 'male' || val === 'm') cleaned[key] = 'Male';
            if (val === 'female' || val === 'f') cleaned[key] = 'Female';
          }
        }
        
        // Fill missing values
        if (!cleaned[key] || cleaned[key] === '') {
          if (key.toLowerCase().includes('age')) {
            cleaned[key] = '25';
            result.warnings.push({
              type: 'MISSING_FILLED',
              message: `Row ${index + 1}, ${key}: Filled missing age with default value`,
              severity: 'medium'
            });
          }
          if (key.toLowerCase().includes('email')) {
            cleaned[key] = 'unknown@email.com';
            result.warnings.push({
              type: 'MISSING_FILLED',
              message: `Row ${index + 1}, ${key}: Filled missing email with placeholder`,
              severity: 'medium'
            });
          }
        }
      });
      
      return cleaned;
    });

    // Step 2: Data Validation
    result.cleanedData.forEach((row, index) => {
      Object.keys(row).forEach(key => {
        const value = row[key];
        const validation = this.validateField(key, value, index + 1);
        if (validation) {
          result.validationReport.push(validation);
        }
      });
    });

    // Step 3: Data Augmentation
    if (options.balanceClasses || options.augmentData) {
      const augmented = this.augmentData(result.cleanedData, options);
      result.cleanedData = augmented.data;
      result.augmentationReport = augmented.report;
    }

    // Generate statistics
    result.statistics = {
      initial: this.generateStats(data),
      final: this.generateStats(result.cleanedData)
    };

    return result;
  }

  validateField(fieldName, value, rowIndex) {
    const field = fieldName.toLowerCase();
    
    // Email validation
    if (field.includes('email')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        return {
          row: rowIndex,
          field: fieldName,
          value: value,
          issue: 'Invalid email format',
          severity: 'high',
          suggestion: 'Use format: user@domain.com'
        };
      }
    }
    
    // Age validation
    if (field.includes('age')) {
      const age = parseInt(value);
      if (isNaN(age) || age < 0 || age > 120) {
        return {
          row: rowIndex,
          field: fieldName,
          value: value,
          issue: 'Invalid age value',
          severity: 'high',
          suggestion: 'Age should be between 0-120'
        };
      }
    }
    
    // Name validation
    if (field.includes('name')) {
      if (value && value.length < 2) {
        return {
          row: rowIndex,
          field: fieldName,
          value: value,
          issue: 'Name too short',
          severity: 'medium',
          suggestion: 'Name should be at least 2 characters'
        };
      }
    }
    
    return null;
  }

  augmentData(data, options) {
    const report = [];
    let augmentedData = [...data];
    
    // Method 1: Duplicate with variations
    if (options.balanceClasses) {
      const variations = this.createVariations(data.slice(0, 2));
      augmentedData = [...augmentedData, ...variations];
      report.push({
        method: 'Class Balancing',
        samplesGenerated: variations.length,
        description: 'Created variations of existing records'
      });
    }
    
    // Method 2: Synthetic data generation
    if (options.augmentData) {
      const synthetic = this.generateSynthetic(data, 3);
      augmentedData = [...augmentedData, ...synthetic];
      report.push({
        method: 'Synthetic Generation',
        samplesGenerated: synthetic.length,
        description: 'Generated completely new synthetic records'
      });
    }
    
    return { data: augmentedData, report };
  }

  createVariations(baseData) {
    const variations = [];
    const nameVariations = ['Alex', 'Sam', 'Jordan', 'Casey', 'Taylor'];
    const emailDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com'];
    
    baseData.forEach((record, index) => {
      const variation = { ...record };
      
      if (variation.name) {
        variation.name = nameVariations[index % nameVariations.length] + ' ' + 
                        (variation.name.split(' ')[1] || 'Smith');
      }
      
      if (variation.email) {
        const username = variation.name ? variation.name.replace(' ', '.').toLowerCase() : 'user';
        variation.email = username + '@' + emailDomains[index % emailDomains.length];
      }
      
      if (variation.age) {
        const baseAge = parseInt(variation.age) || 25;
        variation.age = String(baseAge + Math.floor(Math.random() * 10) - 5);
      }
      
      variations.push(variation);
    });
    
    return variations;
  }

  generateSynthetic(baseData, count) {
    const synthetic = [];
    const names = ['Emma Johnson', 'Liam Brown', 'Olivia Davis', 'Noah Wilson', 'Ava Miller'];
    const categories = ['Male', 'Female'];
    const descriptions = [
      'Experienced professional with strong skills.',
      'Creative individual with innovative ideas.',
      'Dedicated team player with leadership qualities.',
      'Analytical thinker with problem-solving abilities.',
      'Collaborative person with excellent communication.'
    ];
    
    for (let i = 0; i < count; i++) {
      const sample = {
        name: names[i % names.length],
        email: names[i % names.length].replace(' ', '.').toLowerCase() + '@synthetic.com',
        age: String(20 + Math.floor(Math.random() * 40)),
        category: categories[Math.floor(Math.random() * categories.length)],
        description: descriptions[i % descriptions.length]
      };
      
      synthetic.push(sample);
    }
    
    return synthetic;
  }

  generateStats(data) {
    if (!data || data.length === 0) return {};
    
    const columns = Object.keys(data[0]);
    let missingCount = 0;
    
    columns.forEach(col => {
      data.forEach(row => {
        if (!row[col] || row[col] === '') missingCount++;
      });
    });
    
    return {
      totalRows: data.length,
      totalColumns: columns.length,
      missingValues: missingCount
    };
  }
}

const dataProcessor = new EnhancedDataProcessor();
const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Enhanced Data Cleaning API is running' });
});

// Main processing endpoint
app.post('/api/process-data', async (req, res) => {
  try {
    const { data, options = {} } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ 
        error: 'Data array is required',
        success: false 
      });
    }

    console.log(`Processing ${data.length} records`);
    
    const result = await dataProcessor.processData(data, options);
    
    res.json({
      success: true,
      originalData: result.originalData,
      cleanedData: result.cleanedData,
      validationReport: result.validationReport,
      augmentationReport: result.augmentationReport,
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
    console.error('Processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Processing failed'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Enhanced Data Cleaning API running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Process Data: POST /api/process-data`);
});