// Quick test for mathematical computation service
const { MathComputationService } = require('./dist/services/mathComputationService.js');

async function testMathComputation() {
  console.log('Testing Mathematical Computation Service...\n');
  
  const mathService = new MathComputationService();
  
  // Test cases
  const testCases = [
    'square root of 1097',
    'sqrt(1097)',
    'what is the square root of 1097',
    '2 + 2',
    '10 * 5',
    'sqrt(16)',
    'not a math query'
  ];
  
  for (const testCase of testCases) {
    console.log(`Testing: "${testCase}"`);
    
    // Test detection
    const isMath = mathService.isMathQuery(testCase);
    console.log(`  Is Math Query: ${isMath}`);
    
    if (isMath) {
      try {
        const result = await mathService.compute({
          expression: testCase,
          precision: 50,
          format: 'auto'
        });
        
        console.log(`  Success: ${result.success}`);
        if (result.success) {
          console.log(`  Result: ${result.result}`);
          console.log(`  Approximate: ${result.approximateResult || 'N/A'}`);
          console.log(`  Method: ${result.method}`);
          console.log(`  Operation Type: ${result.operationType}`);
          console.log(`  Precision: ${result.precision} decimal places`);
          console.log(`  Execution Time: ${result.metadata.executionTime}ms`);
        } else {
          console.log(`  Error: ${result.error}`);
        }
      } catch (error) {
        console.log(`  Exception: ${error.message}`);
      }
    }
    
    console.log('');
  }
}

testMathComputation().catch(console.error);
