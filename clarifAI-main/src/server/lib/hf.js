// Hugging Face API client for AI data resolution
// Models and endpoints as specified in requirements

const HF_TOKEN = process.env.HF_TOKEN;
const HF_BASE_URL = 'https://api-inference.huggingface.co/models';

// Model configurations
const MODELS = {
  GRAMMAR_CORRECTION: 'prithivida/grammar_error_correcter_v1',
  LABEL_NORMALIZATION: 'sentence-transformers/all-MiniLM-L6-v2',
  ZERO_SHOT_VALIDATION: 'facebook/bart-large-mnli',
  PARAPHRASE_AUGMENTATION: 'Vamsi/T5_Paraphrase_Paws'
};

// Generic function to call Hugging Face API
async function callHuggingFaceAPI(modelId, inputs, options = {}) {
  if (!HF_TOKEN) {
    throw new Error('HF_TOKEN environment variable is required');
  }

  const url = `${HF_BASE_URL}/${modelId}`;
  
  const requestOptions = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(inputs),
    ...options
  };

  try {
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error calling ${modelId}:`, error);
    throw error;
  }
}

// 1. Grammar Correction
export async function grammarCorrection(text) {
  try {
    const result = await callHuggingFaceAPI(MODELS.GRAMMAR_CORRECTION, {
      inputs: text
    });

    // Handle different response formats
    if (Array.isArray(result) && result.length > 0) {
      return result[0].generated_text || result[0].corrected_text || text;
    }
    
    if (typeof result === 'string') {
      return result;
    }

    if (result.generated_text) {
      return result.generated_text;
    }

    // Fallback to original text if no correction found
    return text;
  } catch (error) {
    console.error('Grammar correction failed:', error);
    // Return original text on error to prevent pipeline failure
    return text;
  }
}

// 2. Label Normalization via Embeddings
export async function labelNormalization(labels, referenceLabels = []) {
  try {
    // If no reference labels provided, return original labels
    if (!referenceLabels || referenceLabels.length === 0) {
      return labels.map(label => ({ original: label, normalized: label, confidence: 1.0 }));
    }

    // Get embeddings for all labels
    const allLabels = [...labels, ...referenceLabels];
    const embeddings = await callHuggingFaceAPI(MODELS.LABEL_NORMALIZATION, {
      inputs: allLabels
    });

    if (!Array.isArray(embeddings)) {
      throw new Error('Invalid embeddings response');
    }

    const labelEmbeddings = embeddings.slice(0, labels.length);
    const referenceEmbeddings = embeddings.slice(labels.length);

    // Calculate cosine similarity and find best matches
    const normalizedLabels = labels.map((label, index) => {
      const labelEmbedding = labelEmbeddings[index];
      
      if (!Array.isArray(labelEmbedding)) {
        return { original: label, normalized: label, confidence: 0.0 };
      }

      let bestMatch = referenceLabels[0];
      let bestSimilarity = -1;

      referenceEmbeddings.forEach((refEmbedding, refIndex) => {
        if (Array.isArray(refEmbedding)) {
          const similarity = cosineSimilarity(labelEmbedding, refEmbedding);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatch = referenceLabels[refIndex];
          }
        }
      });

      return {
        original: label,
        normalized: bestMatch,
        confidence: Math.max(0, bestSimilarity)
      };
    });

    return normalizedLabels;
  } catch (error) {
    console.error('Label normalization failed:', error);
    // Return original labels on error
    return labels.map(label => ({ original: label, normalized: label, confidence: 0.0 }));
  }
}

// 3. Zero-shot Validation
export async function zeroShotValidation(text, candidateLabels) {
  try {
    const result = await callHuggingFaceAPI(MODELS.ZERO_SHOT_VALIDATION, {
      inputs: text,
      parameters: {
        candidate_labels: candidateLabels
      }
    });

    if (Array.isArray(result) && result.length > 0) {
      const scores = result[0];
      const maxScoreIndex = scores.indexOf(Math.max(...scores));
      
      return {
        text,
        candidateLabels,
        predictedLabel: candidateLabels[maxScoreIndex],
        confidence: scores[maxScoreIndex],
        scores: candidateLabels.map((label, index) => ({
          label,
          score: scores[index]
        }))
      };
    }

    // Fallback response
    return {
      text,
      candidateLabels,
      predictedLabel: candidateLabels[0],
      confidence: 0.0,
      scores: candidateLabels.map(label => ({ label, score: 0.0 }))
    };
  } catch (error) {
    console.error('Zero-shot validation failed:', error);
    // Return fallback response on error
    return {
      text,
      candidateLabels,
      predictedLabel: candidateLabels[0],
      confidence: 0.0,
      scores: candidateLabels.map(label => ({ label, score: 0.0 }))
    };
  }
}

// 4. Paraphrase Augmentation
export async function paraphraseAugmentation(text, numVariations = 3) {
  try {
    const variations = [];
    
    // Generate multiple variations
    for (let i = 0; i < numVariations; i++) {
      try {
        const result = await callHuggingFaceAPI(MODELS.PARAPHRASE_AUGMENTATION, {
          inputs: text,
          parameters: {
            max_length: 128,
            do_sample: true,
            temperature: 0.7 + (i * 0.1), // Vary temperature for diversity
            top_p: 0.9
          }
        });

        if (Array.isArray(result) && result.length > 0) {
          const generatedText = result[0].generated_text || result[0].paraphrase || text;
          if (generatedText && generatedText.trim() !== text.trim()) {
            variations.push({
              variation: i + 1,
              text: generatedText,
              confidence: 0.8
            });
          }
        }
      } catch (variationError) {
        console.error(`Variation ${i + 1} failed:`, variationError);
        // Continue with other variations
      }
    }

    // If no variations generated, return original text
    if (variations.length === 0) {
      variations.push({
        variation: 1,
        text: text,
        confidence: 1.0
      });
    }

    return variations;
  } catch (error) {
    console.error('Paraphrase augmentation failed:', error);
    // Return original text as fallback
    return [{
      variation: 1,
      text: text,
      confidence: 1.0
    }];
  }
}

// Utility function for cosine similarity
function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
    return 0;
  }

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

// Export model configurations for reference
export { MODELS }; 