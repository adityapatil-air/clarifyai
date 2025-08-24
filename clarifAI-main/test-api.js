// Simple test script for the AI Data Resolution API
// Run with: node test-api.js

const API_BASE = 'http://localhost:3001/api';

async function testAPI() {
  console.log('🧪 Testing AI Data Resolution API...\n');

  // Test health endpoint
  try {
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test grammar correction
  try {
    const grammarResponse = await fetch(`${API_BASE}/clean/grammar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'This is a test sentence with some grammer errors.' })
    });
    const grammarData = await grammarResponse.json();
    console.log('✅ Grammar correction:', grammarData.success ? 'Success' : 'Failed');
    if (grammarData.success) {
      console.log('   Original:', grammarData.original);
      console.log('   Corrected:', grammarData.corrected);
    }
  } catch (error) {
    console.log('❌ Grammar correction failed:', error.message);
  }

  // Test label normalization
  try {
    const normalizeResponse = await fetch(`${API_BASE}/clean/normalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        labels: ['good', 'bad', 'okay'],
        referenceLabels: ['positive', 'negative', 'neutral']
      })
    });
    const normalizeData = await normalizeResponse.json();
    console.log('✅ Label normalization:', normalizeData.success ? 'Success' : 'Failed');
  } catch (error) {
    console.log('❌ Label normalization failed:', error.message);
  }

  // Test validation
  try {
    const validateResponse = await fetch(`${API_BASE}/clean/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: 'This is a valid data entry.',
        candidateLabels: ['valid', 'invalid', 'uncertain']
      })
    });
    const validateData = await validateResponse.json();
    console.log('✅ Validation:', validateData.success ? 'Success' : 'Failed');
  } catch (error) {
    console.log('❌ Validation failed:', error.message);
  }

  // Test augmentation
  try {
    const augmentResponse = await fetch(`${API_BASE}/clean/augment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: 'This is a sample text for augmentation.',
        numVariations: 2
      })
    });
    const augmentData = await augmentResponse.json();
    console.log('✅ Augmentation:', augmentData.success ? 'Success' : 'Failed');
  } catch (error) {
    console.log('❌ Augmentation failed:', error.message);
  }

  console.log('\n🎉 API testing completed!');
}

// Run the test
testAPI().catch(console.error); 