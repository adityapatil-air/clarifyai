// Test script for the enhanced data processing pipeline
// Run with: node test-data-processing.js

const testData = [
  {
    name: "john doe",
    email: "john@invalid",
    age: "",
    category: "MALE",
    description: "A  good   person with  many typos."
  },
  {
    name: "jane smith",
    email: "jane.smith@email.com",
    age: "25",
    category: "female",
    description: "Another person with proper formatting."
  },
  {
    name: "bob johnson",
    email: "",
    age: "thirty",
    category: "M",
    description: "Someone with missing data and inconsistencies."
  },
  {
    name: "alice brown",
    email: "alice@test.com",
    age: "28",
    category: "Female",
    description: "Well formatted entry for comparison."
  },
  {
    name: "charlie wilson",
    email: "charlie.wilson@company.org",
    age: "",
    category: "male",
    description: "Final test entry with mixed issues."
  }
];

async function testDataProcessing() {
  try {
    console.log('🧪 Testing Enhanced Data Processing Pipeline\n');
    console.log('📊 Original Data:');
    console.table(testData);
    
    const response = await fetch('http://localhost:3001/api/process-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: testData,
        options: {
          fixTypos: true,
          normalizeLabels: true,
          fillMissing: true,
          balanceClasses: true,
          augmentData: true,
          targetColumn: 'category'
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('\n✅ Processing Successful!\n');
      
      console.log('📈 Statistics:');
      console.log('Original rows:', result.statistics.initial?.totalRows || 'N/A');
      console.log('Final rows:', result.statistics.final?.totalRows || 'N/A');
      console.log('Missing values (before):', result.statistics.initial?.missingValues || 'N/A');
      console.log('Missing values (after):', result.statistics.final?.missingValues || 'N/A');
      
      console.log('\n🔧 Improvements Made:');
      result.warnings.forEach(warning => {
        console.log(`- ${warning.message}`);
      });
      
      if (result.validationReport && result.validationReport.length > 0) {
        console.log('\n🔍 Validation Issues Found:');
        result.validationReport.forEach(issue => {
          console.log(`- Row ${issue.row}, ${issue.field}: ${issue.issue} (${issue.severity})`);
          console.log(`  Value: "${issue.value}" | Suggestion: ${issue.suggestion}`);
        });
      }
      
      if (result.augmentationReport && result.augmentationReport.length > 0) {
        console.log('\n🎯 Augmentation Report:');
        result.augmentationReport.forEach(aug => {
          console.log(`- ${aug.method}: Generated ${aug.samplesGenerated} samples`);
          console.log(`  Description: ${aug.description}`);
        });
      }
      
      if (result.errors && result.errors.length > 0) {
        console.log('\n⚠️ Errors Encountered:');
        result.errors.forEach(error => {
          console.log(`- ${error.message} (${error.severity})`);
        });
      }
      
      console.log('\n📊 Cleaned Data:');
      console.table(result.cleanedData.slice(0, 10)); // Show first 10 rows
      
      if (result.cleanedData.length > testData.length) {
        console.log(`\n🎯 Class Balancing: Generated ${result.cleanedData.length - testData.length} synthetic samples`);
      }
      
    } else {
      console.error('❌ Processing failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the server is running: npm run dev:server');
  }
}

// Health check first
async function healthCheck() {
  try {
    const response = await fetch('http://localhost:3001/api/health');
    const result = await response.json();
    
    if (result.status === 'ok') {
      console.log('✅ Server is running');
      return true;
    } else {
      console.log('❌ Server health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot connect to server. Please start it with: npm run dev:server');
    return false;
  }
}

// Run the test
async function runTest() {
  console.log('🔍 Checking server status...');
  const isHealthy = await healthCheck();
  
  if (isHealthy) {
    await testDataProcessing();
  }
}

runTest();