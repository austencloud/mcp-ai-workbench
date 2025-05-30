const path = require("path");
const fs = require("fs");

// Import the compiled JavaScript
const {
  MathComputationService,
} = require("./dist/services/mathComputationService");

class TestResults {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.results = [];
  }

  test(name, testFn, expected = null) {
    try {
      const result = testFn();
      if (expected !== null) {
        const success = this.compareResults(result, expected);
        this.record(name, success, result, expected);
      } else {
        this.record(name, true, result);
      }
    } catch (error) {
      this.record(name, false, error.message);
    }
  }

  async testAsync(name, testFn, expected = null) {
    try {
      const result = await testFn();
      if (expected !== null) {
        const success = this.compareResults(result, expected);
        this.record(name, success, result, expected);
      } else {
        this.record(name, true, result);
      }
    } catch (error) {
      this.record(name, false, error.message);
    }
  }

  compareResults(actual, expected) {
    if (typeof expected === "number") {
      const actualNum = parseFloat(actual);
      return Math.abs(actualNum - expected) < 0.000001;
    }
    return actual === expected;
  }

  record(name, success, result, expected = null) {
    this.results.push({ name, success, result, expected });
    if (success) {
      this.passed++;
      console.log(`✅ ${name}: ${result}`);
    } else {
      this.failed++;
      console.log(`❌ ${name}: got ${result}, expected ${expected}`);
    }
  }

  summary() {
    console.log(
      `\n📊 Test Summary: ${this.passed} passed, ${this.failed} failed`
    );
    console.log(
      `Success Rate: ${(
        (this.passed / (this.passed + this.failed)) *
        100
      ).toFixed(1)}%`
    );

    if (this.failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`   ${r.name}: ${r.result}`);
        });
    }

    return this.failed === 0;
  }
}

async function runComprehensiveMathTests() {
  console.log("🧮 Starting Comprehensive Math Computation Tests\n");

  const mathService = new MathComputationService({
    enableHighPrecision: true,
    maxPrecision: 50,
    enableFallback: true,
  });

  const tests = new TestResults();

  // Basic Arithmetic Tests
  console.log("📐 Basic Arithmetic Tests");
  await tests.testAsync(
    "Simple Addition",
    async () => {
      const result = await mathService.compute({ expression: "10 + 5" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    15
  );

  await tests.testAsync(
    "Comma Numbers",
    async () => {
      const result = await mathService.compute({ expression: "10,027 / 26" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    385.65384615384615
  );

  await tests.testAsync(
    "Large Division",
    async () => {
      const result = await mathService.compute({ expression: "999999 / 7" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    142857
  );

  await tests.testAsync(
    "Decimal Precision",
    async () => {
      const result = await mathService.compute({ expression: "0.1 + 0.2" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    0.3
  );

  // Square Root Tests
  console.log("\n🔢 Square Root Tests");
  await tests.testAsync(
    "Perfect Square",
    async () => {
      const result = await mathService.compute({ expression: "sqrt(144)" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    12
  );

  await tests.testAsync(
    "Non-Perfect Square",
    async () => {
      const result = await mathService.compute({ expression: "sqrt(2)" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    Math.sqrt(2)
  );

  await tests.testAsync(
    "Large Square Root",
    async () => {
      const result = await mathService.compute({ expression: "sqrt(1000000)" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    1000
  );

  // Power and Exponential Tests
  console.log("\n⚡ Power and Exponential Tests");
  await tests.testAsync(
    "Basic Power",
    async () => {
      const result = await mathService.compute({ expression: "2^8" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    256
  );

  await tests.testAsync(
    "Large Power",
    async () => {
      const result = await mathService.compute({ expression: "10^6" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    1000000
  );

  // Complex Expression Tests
  console.log("\n🔧 Complex Expression Tests");
  await tests.testAsync(
    "Order of Operations",
    async () => {
      const result = await mathService.compute({ expression: "2 + 3 * 4" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    14
  );

  await tests.testAsync(
    "Parentheses Priority",
    async () => {
      const result = await mathService.compute({ expression: "(2 + 3) * 4" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    20
  );

  await tests.testAsync(
    "Nested Parentheses",
    async () => {
      const result = await mathService.compute({
        expression: "((2 + 3) * 4) / 2",
      });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    10
  );

  // Percentage Tests
  console.log("\n📊 Percentage Tests");
  await tests.testAsync(
    "Simple Percentage",
    async () => {
      const result = await mathService.compute({ expression: "50 * 0.20" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    10
  );

  await tests.testAsync(
    "Tax Calculation",
    async () => {
      const result = await mathService.compute({ expression: "100 * 1.08" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    108
  );

  // Scientific Notation Tests
  console.log("\n🔬 Scientific Notation Tests");
  await tests.testAsync(
    "Scientific Addition",
    async () => {
      const result = await mathService.compute({ expression: "1e6 + 1e3" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    1001000
  );

  await tests.testAsync(
    "Scientific Multiplication",
    async () => {
      const result = await mathService.compute({ expression: "2e3 * 3e2" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    600000
  );

  // Trigonometric Tests
  console.log("\n📐 Trigonometric Tests");
  await tests.testAsync(
    "Sine of 0",
    async () => {
      const result = await mathService.compute({ expression: "sin(0)" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    0
  );

  await tests.testAsync(
    "Cosine of 0",
    async () => {
      const result = await mathService.compute({ expression: "cos(0)" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    1
  );

  // Edge Cases and Error Handling
  console.log("\n⚠️ Edge Cases and Error Handling");
  await tests.testAsync(
    "Division by Zero",
    async () => {
      const result = await mathService.compute({ expression: "10 / 0" });
      return result.success ? "SHOULD_FAIL" : "CORRECTLY_FAILED";
    },
    "CORRECTLY_FAILED"
  );

  await tests.testAsync(
    "Very Large Number",
    async () => {
      const result = await mathService.compute({
        expression: "999999999999999 * 999999999999999",
      });
      return result.success ? "COMPUTED" : "FAILED";
    },
    "COMPUTED"
  );

  // Detection Tests
  console.log("\n🔍 Math Detection Tests");
  tests.test(
    "Detect Simple Math",
    () => {
      return mathService.isMathQuery("what is 2 + 2");
    },
    true
  );

  tests.test(
    "Detect Complex Math",
    () => {
      return mathService.isMathQuery("Calculate the square root of 144");
    },
    true
  );

  tests.test(
    "Detect Percentage",
    () => {
      return mathService.isMathQuery("What is 15% of 200");
    },
    true
  );

  tests.test(
    "Detect Word Problem",
    () => {
      return mathService.isMathQuery("How much is 10,000 divided by 5");
    },
    true
  );

  tests.test(
    "Reject Non-Math",
    () => {
      return mathService.isMathQuery("Hello, how are you today?");
    },
    false
  );

  tests.test(
    "Reject Casual Math Talk",
    () => {
      return mathService.isMathQuery("I love math class");
    },
    false
  );

  // Real-world Math Problems
  console.log("\n🌍 Real-world Math Problems");
  await tests.testAsync(
    "Compound Interest",
    async () => {
      const result = await mathService.compute({
        expression: "1000 * (1.05)^10",
      });
      const expected = 1000 * Math.pow(1.05, 10);
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    1000 * Math.pow(1.05, 10)
  );

  await tests.testAsync(
    "Area of Circle",
    async () => {
      const result = await mathService.compute({ expression: "3.14159 * 5^2" });
      return result.success ? parseFloat(result.result) : "FAILED";
    },
    78.53975
  );

  // Performance Tests
  console.log("\n⚡ Performance Tests");
  const startTime = Date.now();
  for (let i = 0; i < 10; i++) {
    await mathService.compute({ expression: `${i * 123} + ${i * 456}` });
  }
  const duration = Date.now() - startTime;
  tests.test(
    "Performance (10 calculations)",
    () => {
      return duration < 2000 ? "FAST" : "SLOW";
    },
    "FAST"
  );

  // Precision Tests
  console.log("\n🎯 High Precision Tests");
  await tests.testAsync(
    "High Precision Division",
    async () => {
      const result = await mathService.compute({
        expression: "1/3",
        precision: 50,
      });
      const hasEnoughDigits = result.result.length > 10;
      return result.success && hasEnoughDigits
        ? "HIGH_PRECISION"
        : "LOW_PRECISION";
    },
    "HIGH_PRECISION"
  );

  return tests.summary();
}

// Additional stress tests
async function runStressTests() {
  console.log("\n🔥 Stress Tests");
  const mathService = new MathComputationService();
  const tests = new TestResults();

  // Test with random expressions
  for (let i = 0; i < 10; i++) {
    const a = Math.floor(Math.random() * 1000) + 1;
    const b = Math.floor(Math.random() * 100) + 1;
    const ops = ["+", "-", "*", "/"];
    const op = ops[Math.floor(Math.random() * ops.length)];

    await tests.testAsync(
      `Random: ${a} ${op} ${b}`,
      async () => {
        const result = await mathService.compute({
          expression: `${a} ${op} ${b}`,
        });
        return result.success ? "COMPUTED" : "FAILED";
      },
      "COMPUTED"
    );
  }

  return tests.summary();
}

if (require.main === module) {
  runComprehensiveMathTests()
    .then((success) => {
      console.log("\n" + "=".repeat(50));
      if (success) {
        console.log("🎉 ALL TESTS PASSED! Math system is A+ ready!");
        return runStressTests();
      } else {
        console.log("❌ Some tests failed. Please review and fix issues.");
        process.exit(1);
      }
    })
    .then((stressSuccess) => {
      if (stressSuccess) {
        console.log("🚀 STRESS TESTS PASSED! System is robust!");
      }
    })
    .catch((error) => {
      console.error("💥 Test suite failed:", error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveMathTests, runStressTests };
