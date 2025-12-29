import { NextResponse } from "next/server";
import { isAIEnabled } from "@/lib/ai";

/**
 * Test endpoint to verify AI API connectivity
 * This helps diagnose network issues in production
 */
export async function GET(request) {
  const results = {
    timestamp: new Date().toISOString(),
    aiEnabled: isAIEnabled(),
    tests: {},
  };

  // Test 1: Check if AI is enabled
  results.tests.aiEnabled = {
    passed: isAIEnabled(),
    message: isAIEnabled() 
      ? "AI is enabled (API keys are set)" 
      : "AI is not enabled - check environment variables",
  };

  // Test 2: Test Gemini API connectivity (if enabled)
  if (process.env.GEMINI_API_KEY) {
    try {
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(testUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "test" }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      results.tests.geminiConnectivity = {
        passed: response.ok,
        status: response.status,
        message: response.ok 
          ? "Successfully connected to Gemini API" 
          : `Failed with status ${response.status}`,
      };
    } catch (error) {
      results.tests.geminiConnectivity = {
        passed: false,
        error: error.message,
        name: error.name,
        message: `Failed to connect: ${error.message}`,
      };
    }
  }

  // Test 3: Test Hugging Face API connectivity (if enabled)
  if (process.env.HUGGINGFACE_API_KEY) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased to 10 seconds
      
      const endpoint = "https://api.huggingface.co/v1/chat/completions";
      console.log("[Test] Attempting to connect to Hugging Face API:", endpoint);
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.HUGGINGFACE_MODEL || "meta-llama/Llama-3.1-8B-Instruct",
          messages: [{ role: "user", content: "test" }],
          max_tokens: 10,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      let responseText = "";
      try {
        responseText = await response.text();
      } catch (e) {
        // Ignore text parsing errors
      }
      
      results.tests.huggingfaceConnectivity = {
        passed: response.ok,
        status: response.status,
        statusText: response.statusText,
        message: response.ok 
          ? "Successfully connected to Hugging Face API" 
          : `Failed with status ${response.status}: ${responseText.substring(0, 200)}`,
        responsePreview: responseText.substring(0, 200),
      };
    } catch (error) {
      console.error("[Test] Hugging Face connection error:", error);
      results.tests.huggingfaceConnectivity = {
        passed: false,
        error: error.message,
        name: error.name,
        cause: error.cause ? {
          message: error.cause.message,
          code: error.cause.code,
          errno: error.cause.errno,
          syscall: error.cause.syscall,
          hostname: error.cause.hostname,
        } : null,
        stack: error.stack,
        message: `Failed to connect: ${error.message}${error.cause ? ` (${error.cause.message || error.cause})` : ''}`,
      };
    }
  }

  // Test 4: Basic DNS/Network test
  try {
    const response = await fetch("https://www.google.com", {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    results.tests.generalConnectivity = {
      passed: response.ok,
      message: "Server can reach external websites",
    };
  } catch (error) {
    results.tests.generalConnectivity = {
      passed: false,
      error: error.message,
      message: "Server cannot reach external websites - network issue",
    };
  }

  // Test 5: DNS resolution test for Hugging Face (if enabled)
  if (process.env.HUGGINGFACE_API_KEY) {
    try {
      const dns = await import('dns').then(m => m.promises);
      const addresses = await dns.resolve4('api.huggingface.co');
      results.tests.huggingfaceDNS = {
        passed: true,
        addresses: addresses,
        message: `DNS resolution successful: ${addresses.join(', ')}`,
      };
    } catch (error) {
      results.tests.huggingfaceDNS = {
        passed: false,
        error: error.message,
        code: error.code,
        message: `DNS resolution failed: ${error.message}`,
      };
    }
  }

  const allTestsPassed = Object.values(results.tests).every(test => test.passed);
  
  // Always return 200 so we can see the test results even if some fail
  return NextResponse.json(
    {
      ...results,
      summary: allTestsPassed 
        ? "All tests passed" 
        : "Some tests failed - check details below",
      allPassed: allTestsPassed,
      nodeVersion: process.version,
      platform: process.platform,
    },
    { status: 200 }
  );
}

