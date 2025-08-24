import { HfInference } from '@huggingface/inference';

// Enhanced data processing pipeline with robust error handling
export class DataProcessor {
  private hf: HfInference;
  private readonly BATCH_SIZE = 10;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  constructor(token?: string) {
    this.hf = new HfInference(token || process.env.HF_TOKEN);
  }

  // Main processing pipeline
  async processData(data: any[], options: ProcessingOptions = {}): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      originalData: data,
      cleanedData: [...data],
      statistics: this.generateStatistics(data),
      errors: [],
      warnings: []
    };

    try {
      // Step 1: Detect and fix typos
      if (options.fixTypos !== false) {
        result.cleanedData = await this.fixTypos(result.cleanedData, result);
      }

      // Step 2: Normalize labels
      if (options.normalizeLabels !== false) {
        result.cleanedData = await this.normalizeLabels(result.cleanedData, result);
      }

      // Step 3: Fill missing values
      if (options.fillMissing !== false) {
        result.cleanedData = await this.fillMissingValues(result.cleanedData, result);
      }

      // Step 4: Balance classes (synthetic data generation)
      if (options.balanceClasses !== false && options.targetColumn) {
        result.cleanedData = await this.balanceClasses(result.cleanedData, options.targetColumn, result);
      }

      result.statistics.final = this.generateStatistics(result.cleanedData);
      return result;

    } catch (error) {
      result.errors.push({
        type: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown processing error',
        severity: 'high'
      });
      return result;
    }
  }

  // 1. Typo Detection and Correction
  private async fixTypos(data: any[], result: ProcessingResult): Promise<any[]> {
    const textColumns = this.identifyTextColumns(data);
    if (textColumns.length === 0) return data;

    const correctedData = [...data];
    let correctionCount = 0;

    for (const column of textColumns) {
      try {
        // Use local spell checking first (faster and more reliable)
        for (let i = 0; i < correctedData.length; i++) {
          const originalText = correctedData[i][column];
          if (typeof originalText === 'string' && originalText.length > 0) {
            const correctedText = await this.correctTextLocal(originalText);
            if (correctedText !== originalText) {
              correctedData[i][column] = correctedText;
              correctionCount++;
            }
          }
        }

        // For complex corrections, use AI model with batching
        if (correctionCount < data.length * 0.1) { // Only if local corrections are minimal
          await this.correctTextWithAI(correctedData, column);
        }

      } catch (error) {
        result.warnings.push({
          type: 'TYPO_CORRECTION_WARNING',
          message: `Failed to correct typos in column '${column}': ${error}`,
          severity: 'medium'
        });
      }
    }

    result.warnings.push({
      type: 'TYPO_CORRECTION_COMPLETE',
      message: `Corrected ${correctionCount} typos across ${textColumns.length} text columns`,
      severity: 'low'
    });

    return correctedData;
  }

  // Local spell checking (fast and reliable)
  private async correctTextLocal(text: string): Promise<string> {
    // Common typo patterns and corrections
    const corrections: Record<string, string> = {
      // Common misspellings
      'recieve': 'receive',
      'seperate': 'separate',
      'definately': 'definitely',
      'occured': 'occurred',
      'neccessary': 'necessary',
      'accomodate': 'accommodate',
      'begining': 'beginning',
      'beleive': 'believe',
      'calender': 'calendar',
      'cemetary': 'cemetery',
      // Case normalization
      'MALE': 'Male',
      'FEMALE': 'Female',
      'YES': 'Yes',
      'NO': 'No',
      'TRUE': 'True',
      'FALSE': 'False'
    };

    let corrected = text;
    
    // Apply corrections
    for (const [wrong, right] of Object.entries(corrections)) {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      corrected = corrected.replace(regex, right);
    }

    // Fix common formatting issues
    corrected = corrected
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .replace(/([.!?])\s*([a-z])/g, '$1 $2') // Fix spacing after punctuation
      .replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between camelCase

    return corrected;
  }

  // AI-powered text correction (fallback for complex cases)
  private async correctTextWithAI(data: any[], column: string): Promise<void> {
    const batches = this.createBatches(data, this.BATCH_SIZE);
    
    for (const batch of batches) {
      try {
        const promises = batch.map(async (item, index) => {
          const text = item[column];
          if (typeof text === 'string' && text.length > 10) {
            try {
              const corrected = await this.retryOperation(async () => {
                const result = await this.hf.textGeneration({
                  model: 'microsoft/DialoGPT-medium',
                  inputs: `Fix grammar and spelling: "${text}"`,
                  parameters: {
                    max_new_tokens: 100,
                    temperature: 0.1,
                    return_full_text: false
                  }
                });
                return result.generated_text?.trim() || text;
              });
              
              if (corrected && corrected !== text && corrected.length < text.length * 2) {
                item[column] = corrected;
              }
            } catch (error) {
              // Keep original text on error
              console.warn(`AI correction failed for text: ${text.substring(0, 50)}...`);
            }
          }
        });

        await Promise.allSettled(promises);
        await this.delay(200); // Rate limiting
      } catch (error) {
        console.warn('Batch AI correction failed:', error);
      }
    }
  }

  // 2. Label Normalization
  private async normalizeLabels(data: any[], result: ProcessingResult): Promise<any[]> {
    const categoricalColumns = this.identifyCategoricalColumns(data);
    if (categoricalColumns.length === 0) return data;

    const normalizedData = [...data];
    let normalizationCount = 0;

    for (const column of categoricalColumns) {
      try {
        const uniqueValues = [...new Set(data.map(row => row[column]).filter(v => v != null))];
        const normalizedMap = this.createNormalizationMap(uniqueValues);
        
        for (let i = 0; i < normalizedData.length; i++) {
          const originalValue = normalizedData[i][column];
          if (originalValue != null && normalizedMap.has(originalValue)) {
            const normalizedValue = normalizedMap.get(originalValue);
            if (normalizedValue !== originalValue) {
              normalizedData[i][column] = normalizedValue;
              normalizationCount++;
            }
          }
        }
      } catch (error) {
        result.warnings.push({
          type: 'NORMALIZATION_WARNING',
          message: `Failed to normalize column '${column}': ${error}`,
          severity: 'medium'
        });
      }
    }

    result.warnings.push({
      type: 'NORMALIZATION_COMPLETE',
      message: `Normalized ${normalizationCount} labels across ${categoricalColumns.length} categorical columns`,
      severity: 'low'
    });

    return normalizedData;
  }

  // Create normalization mapping
  private createNormalizationMap(values: any[]): Map<any, any> {
    const map = new Map();
    const groups = new Map<string, any[]>();

    // Group similar values
    for (const value of values) {
      const normalized = String(value).toLowerCase().trim();
      if (!groups.has(normalized)) {
        groups.set(normalized, []);
      }
      groups.get(normalized)!.push(value);
    }

    // Create mappings
    for (const [normalized, variants] of groups) {
      if (variants.length > 1) {
        // Choose the most common variant as the canonical form
        const canonical = this.getMostCommonVariant(variants);
        for (const variant of variants) {
          map.set(variant, canonical);
        }
      } else {
        map.set(variants[0], variants[0]);
      }
    }

    return map;
  }

  private getMostCommonVariant(variants: any[]): any {
    const counts = new Map();
    for (const variant of variants) {
      counts.set(variant, (counts.get(variant) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  // 3. Missing Value Imputation
  private async fillMissingValues(data: any[], result: ProcessingResult): Promise<any[]> {
    if (data.length === 0) return data;

    const filledData = [...data];
    const columns = Object.keys(data[0]);
    let fillCount = 0;

    for (const column of columns) {
      try {
        const columnData = data.map(row => row[column]);
        const missingIndices = columnData
          .map((value, index) => ({ value, index }))
          .filter(({ value }) => this.isMissing(value))
          .map(({ index }) => index);

        if (missingIndices.length === 0) continue;

        const columnType = this.inferColumnType(columnData);
        const fillValue = await this.calculateFillValue(columnData, columnType);

        for (const index of missingIndices) {
          filledData[index][column] = fillValue;
          fillCount++;
        }
      } catch (error) {
        result.warnings.push({
          type: 'MISSING_VALUE_WARNING',
          message: `Failed to fill missing values in column '${column}': ${error}`,
          severity: 'medium'
        });
      }
    }

    result.warnings.push({
      type: 'MISSING_VALUE_COMPLETE',
      message: `Filled ${fillCount} missing values using statistical imputation`,
      severity: 'low'
    });

    return filledData;
  }

  private isMissing(value: any): boolean {
    return value === null || 
           value === undefined || 
           value === '' || 
           (typeof value === 'string' && value.trim() === '') ||
           (typeof value === 'string' && ['null', 'undefined', 'na', 'n/a', 'none'].includes(value.toLowerCase()));
  }

  private inferColumnType(data: any[]): 'numeric' | 'categorical' | 'text' {
    const nonMissingData = data.filter(value => !this.isMissing(value));
    if (nonMissingData.length === 0) return 'text';

    const numericCount = nonMissingData.filter(value => !isNaN(Number(value))).length;
    const numericRatio = numericCount / nonMissingData.length;

    if (numericRatio > 0.8) return 'numeric';
    
    const uniqueValues = new Set(nonMissingData);
    const uniqueRatio = uniqueValues.size / nonMissingData.length;
    
    return uniqueRatio < 0.1 ? 'categorical' : 'text';
  }

  private async calculateFillValue(data: any[], type: 'numeric' | 'categorical' | 'text'): Promise<any> {
    const nonMissingData = data.filter(value => !this.isMissing(value));
    
    if (nonMissingData.length === 0) return '';

    switch (type) {
      case 'numeric':
        const numbers = nonMissingData.map(v => Number(v)).filter(n => !isNaN(n));
        return numbers.length > 0 ? this.calculateMedian(numbers) : 0;
      
      case 'categorical':
        return this.getMostFrequent(nonMissingData);
      
      case 'text':
        // For text, use the most common value or generate a placeholder
        const mostCommon = this.getMostFrequent(nonMissingData);
        return mostCommon || 'Unknown';
    }
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = numbers.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private getMostFrequent(data: any[]): any {
    const counts = new Map();
    for (const value of data) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  // 4. Class Balancing (Synthetic Data Generation)
  private async balanceClasses(data: any[], targetColumn: string, result: ProcessingResult): Promise<any[]> {
    if (!data.some(row => row[targetColumn])) {
      result.warnings.push({
        type: 'CLASS_BALANCE_WARNING',
        message: `Target column '${targetColumn}' not found`,
        severity: 'medium'
      });
      return data;
    }

    try {
      const classDistribution = this.getClassDistribution(data, targetColumn);
      const maxClassSize = Math.max(...Object.values(classDistribution));
      const minorityClasses = Object.entries(classDistribution)
        .filter(([_, count]) => count < maxClassSize * 0.8)
        .map(([className]) => className);

      if (minorityClasses.length === 0) {
        result.warnings.push({
          type: 'CLASS_BALANCE_INFO',
          message: 'Classes are already balanced',
          severity: 'low'
        });
        return data;
      }

      const balancedData = [...data];
      let syntheticCount = 0;

      for (const minorityClass of minorityClasses) {
        const classData = data.filter(row => row[targetColumn] === minorityClass);
        const samplesNeeded = Math.floor(maxClassSize * 0.8) - classData.length;
        
        if (samplesNeeded > 0) {
          const syntheticSamples = await this.generateSyntheticSamples(classData, samplesNeeded);
          balancedData.push(...syntheticSamples);
          syntheticCount += syntheticSamples.length;
        }
      }

      result.warnings.push({
        type: 'CLASS_BALANCE_COMPLETE',
        message: `Generated ${syntheticCount} synthetic samples to balance classes`,
        severity: 'low'
      });

      return balancedData;
    } catch (error) {
      result.errors.push({
        type: 'CLASS_BALANCE_ERROR',
        message: `Failed to balance classes: ${error}`,
        severity: 'medium'
      });
      return data;
    }
  }

  private getClassDistribution(data: any[], targetColumn: string): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const row of data) {
      const className = String(row[targetColumn]);
      distribution[className] = (distribution[className] || 0) + 1;
    }
    return distribution;
  }

  private async generateSyntheticSamples(classData: any[], count: number): Promise<any[]> {
    if (classData.length === 0) return [];

    const syntheticSamples: any[] = [];
    const columns = Object.keys(classData[0]);

    for (let i = 0; i < count; i++) {
      const baseSample = classData[Math.floor(Math.random() * classData.length)];
      const syntheticSample: any = {};

      for (const column of columns) {
        const columnData = classData.map(row => row[column]);
        const columnType = this.inferColumnType(columnData);

        switch (columnType) {
          case 'numeric':
            syntheticSample[column] = this.generateSyntheticNumeric(columnData);
            break;
          case 'categorical':
            syntheticSample[column] = this.generateSyntheticCategorical(columnData);
            break;
          case 'text':
            syntheticSample[column] = await this.generateSyntheticText(columnData);
            break;
        }
      }

      syntheticSamples.push(syntheticSample);
    }

    return syntheticSamples;
  }

  private generateSyntheticNumeric(data: any[]): number {
    const numbers = data.map(v => Number(v)).filter(n => !isNaN(n));
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
    const stdDev = Math.sqrt(variance);

    // Generate using normal distribution approximation
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    return Math.round((mean + z0 * stdDev) * 100) / 100;
  }

  private generateSyntheticCategorical(data: any[]): any {
    const nonMissingData = data.filter(v => !this.isMissing(v));
    return nonMissingData[Math.floor(Math.random() * nonMissingData.length)];
  }

  private async generateSyntheticText(data: any[]): Promise<string> {
    const nonMissingData = data.filter(v => !this.isMissing(v) && typeof v === 'string');
    if (nonMissingData.length === 0) return 'Generated text';

    // Simple text variation by combining parts from existing samples
    const words = nonMissingData.join(' ').split(' ').filter(w => w.length > 2);
    const uniqueWords = [...new Set(words)];
    
    if (uniqueWords.length < 3) {
      return nonMissingData[Math.floor(Math.random() * nonMissingData.length)];
    }

    // Generate new text by combining random words
    const numWords = Math.min(5, Math.max(2, Math.floor(Math.random() * 4) + 2));
    const selectedWords = [];
    
    for (let i = 0; i < numWords; i++) {
      selectedWords.push(uniqueWords[Math.floor(Math.random() * uniqueWords.length)]);
    }

    return selectedWords.join(' ');
  }

  // Utility methods
  private identifyTextColumns(data: any[]): string[] {
    if (data.length === 0) return [];
    
    const columns = Object.keys(data[0]);
    return columns.filter(column => {
      const sample = data.slice(0, Math.min(100, data.length));
      const textCount = sample.filter(row => 
        typeof row[column] === 'string' && row[column].length > 10
      ).length;
      return textCount / sample.length > 0.5;
    });
  }

  private identifyCategoricalColumns(data: any[]): string[] {
    if (data.length === 0) return [];
    
    const columns = Object.keys(data[0]);
    return columns.filter(column => {
      const values = data.map(row => row[column]).filter(v => v != null);
      const uniqueValues = new Set(values);
      const uniqueRatio = uniqueValues.size / values.length;
      return uniqueRatio < 0.1 && uniqueValues.size > 1 && uniqueValues.size < 50;
    });
  }

  private generateStatistics(data: any[]): DataStatistics {
    if (data.length === 0) {
      return {
        totalRows: 0,
        totalColumns: 0,
        missingValues: 0,
        duplicateRows: 0,
        columnTypes: {}
      };
    }

    const columns = Object.keys(data[0]);
    const columnTypes: Record<string, string> = {};
    let missingValues = 0;

    for (const column of columns) {
      const columnData = data.map(row => row[column]);
      columnTypes[column] = this.inferColumnType(columnData);
      missingValues += columnData.filter(value => this.isMissing(value)).length;
    }

    // Count duplicate rows
    const rowStrings = data.map(row => JSON.stringify(row));
    const uniqueRows = new Set(rowStrings);
    const duplicateRows = data.length - uniqueRows.size;

    return {
      totalRows: data.length,
      totalColumns: columns.length,
      missingValues,
      duplicateRows,
      columnTypes
    };
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY * attempt);
        }
      }
    }
    
    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Type definitions
export interface ProcessingOptions {
  fixTypos?: boolean;
  normalizeLabels?: boolean;
  fillMissing?: boolean;
  balanceClasses?: boolean;
  targetColumn?: string;
}

export interface ProcessingResult {
  originalData: any[];
  cleanedData: any[];
  statistics: {
    initial?: DataStatistics;
    final?: DataStatistics;
  };
  errors: ProcessingError[];
  warnings: ProcessingError[];
}

export interface DataStatistics {
  totalRows: number;
  totalColumns: number;
  missingValues: number;
  duplicateRows: number;
  columnTypes: Record<string, string>;
}

export interface ProcessingError {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}