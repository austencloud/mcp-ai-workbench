const axios = require("axios");

async function testLocalModelUsage() {
  console.log(
    "🔍 Testing which AI model is being used by the reasoning system...\n"
  );

  try {
    // Test reasoning endpoint
    const response = await axios.post("http://localhost:4000/api/reasoning", {
      problem: "What is 2 + 2?",
      context: "Simple math test to verify local model usage",
    });

    console.log("📊 REASONING SYSTEM TEST RESULTS:");
    console.log("=".repeat(50));

    if (response.data.trace && response.data.trace.steps) {
      response.data.trace.steps.forEach((step, index) => {
        console.log(`\nStep ${step.stepNumber}: ${step.description}`);

        if (step.toolOutput && step.toolOutput.providerUsed) {
          const isLocal = step.toolOutput.isLocal;
          const provider = step.toolOutput.providerUsed;
          const model = step.toolOutput.modelUsed;

          if (isLocal) {
            console.log(`✅ LOCAL MODEL: ${provider}:${model}`);
          } else {
            console.log(`⚠️  CLOUD MODEL: ${provider}:${model}`);
          }
        }

        console.log(`   Confidence: ${step.confidence}`);
        console.log(`   Duration: ${step.duration}ms`);
      });

      // Summary
      const localSteps = response.data.trace.steps.filter(
        (s) => s.toolOutput && s.toolOutput.isLocal
      ).length;
      const totalSteps = response.data.trace.steps.filter(
        (s) => s.toolOutput && s.toolOutput.providerUsed
      ).length;

      console.log("\n" + "=".repeat(50));
      console.log(`📈 SUMMARY:`);
      console.log(`   Local model usage: ${localSteps}/${totalSteps} steps`);
      console.log(`   Overall success: ${response.data.success}`);
      console.log(`   Final answer: ${response.data.trace.finalAnswer}`);

      if (localSteps === totalSteps && totalSteps > 0) {
        console.log("🎉 ALL STEPS USED LOCAL OLLAMA MODEL!");
      } else if (localSteps > 0) {
        console.log("⚠️  MIXED: Some steps used local, some used cloud models");
      } else {
        console.log("❌ NO LOCAL MODEL USAGE - Check Ollama installation");
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.log(
        "\n💡 Backend server is not running. Start it with: npm start"
      );
    }
  }
}

async function checkOllamaStatus() {
  console.log("\n🔍 Checking Ollama status...");

  try {
    const response = await axios.get("http://localhost:11434/api/tags");
    console.log("✅ Ollama is running");
    console.log(
      "📋 Available models:",
      response.data.models.map((m) => m.name).join(", ")
    );
  } catch (error) {
    console.log("❌ Ollama is not accessible on localhost:11434");
    console.log("💡 Make sure Ollama is installed and running");
    console.log("   Download from: https://ollama.ai");
    console.log("   Then run: ollama pull llama3:latest");
  }
}

async function main() {
  await checkOllamaStatus();
  await testLocalModelUsage();
}

main();
