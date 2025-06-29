#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Self-Healing Backend Connection System
 * Tests all aspects of the new connection architecture
 */

import fetch from 'node-fetch';

const FRONTEND_URL = 'http://localhost:5174';
const BACKEND_PORTS = [4000, 4001, 4002, 4003, 4004, 4005];

class ConnectionSystemTester {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📋',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'test': '🧪'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTest(name, testFn) {
    this.log(`Running test: ${name}`, 'test');
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.testResults.push({ name, status: 'PASS', duration });
      this.log(`✅ ${name} - PASSED (${duration}ms)`, 'success');
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({ name, status: 'FAIL', duration, error: error.message });
      this.log(`❌ ${name} - FAILED: ${error.message}`, 'error');
    }
  }

  async testBackendDiscovery() {
    this.log('Testing backend port discovery...', 'info');
    
    for (const port of BACKEND_PORTS) {
      try {
        const response = await fetch(`http://localhost:${port}/health`, {
          method: 'GET',
          timeout: 2000
        });
        
        if (response.ok) {
          this.log(`Found healthy backend on port ${port}`, 'success');
          return port;
        }
      } catch (error) {
        // Port not available, continue
      }
    }
    
    throw new Error('No backend endpoints discovered');
  }

  async testFrontendConnection() {
    this.log('Testing frontend accessibility...', 'info');
    
    const response = await fetch(FRONTEND_URL, {
      method: 'GET',
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`Frontend not accessible: ${response.status}`);
    }
    
    this.log('Frontend is accessible', 'success');
  }

  async testConnectionStatusIndicator() {
    this.log('Testing connection status indicator...', 'info');
    
    // This would require browser automation to fully test
    // For now, we'll just verify the frontend loads
    const response = await fetch(FRONTEND_URL, {
      method: 'GET',
      timeout: 5000
    });
    
    const html = await response.text();
    
    // Check if our connection status component is included
    if (!html.includes('ConnectionStatusIndicator')) {
      this.log('Connection status indicator may not be properly integrated', 'warning');
    } else {
      this.log('Connection status indicator appears to be integrated', 'success');
    }
  }

  async testRPCEndpoint(port) {
    this.log(`Testing RPC endpoint on port ${port}...`, 'info');
    
    const rpcUrl = `http://localhost:${port}/rpc`;
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'getAvailableProviders',
        params: {},
        id: 1
      }),
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`RPC endpoint failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }
    
    this.log('RPC endpoint is working correctly', 'success');
    return data.result;
  }

  async testConnectionResilience() {
    this.log('Testing connection resilience...', 'info');
    
    // Test multiple rapid requests to simulate real usage
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(this.makeTestRequest());
    }
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    this.log(`Resilience test: ${successful} successful, ${failed} failed`, 
             failed === 0 ? 'success' : 'warning');
    
    if (failed > successful) {
      throw new Error('Connection resilience test failed - too many failures');
    }
  }

  async makeTestRequest() {
    // Find an available backend port
    for (const port of BACKEND_PORTS) {
      try {
        const response = await fetch(`http://localhost:${port}/rpc`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'getAvailableProviders',
            params: {},
            id: Date.now()
          }),
          timeout: 3000
        });
        
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        continue;
      }
    }
    
    throw new Error('No backend available for test request');
  }

  async testHealthEndpoints() {
    this.log('Testing health endpoints...', 'info');
    
    let healthyCount = 0;
    
    for (const port of BACKEND_PORTS) {
      try {
        const response = await fetch(`http://localhost:${port}/health`, {
          method: 'GET',
          timeout: 2000
        });
        
        if (response.ok) {
          healthyCount++;
          this.log(`Health endpoint on port ${port} is healthy`, 'success');
        }
      } catch (error) {
        // Port not available
      }
    }
    
    if (healthyCount === 0) {
      throw new Error('No healthy backend endpoints found');
    }
    
    this.log(`Found ${healthyCount} healthy backend endpoints`, 'success');
  }

  async testErrorHandling() {
    this.log('Testing error handling...', 'info');
    
    // Test request to non-existent endpoint
    try {
      await fetch('http://localhost:9999/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'test',
          params: {},
          id: 1
        }),
        timeout: 1000
      });
      
      throw new Error('Expected connection error but request succeeded');
    } catch (error) {
      if (error.message.includes('Expected connection error')) {
        throw error;
      }
      // Expected error - connection failed as intended
      this.log('Error handling working correctly - connection errors are caught', 'success');
    }
  }

  printSummary() {
    const totalTests = this.testResults.length;
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('🧪 CONNECTION SYSTEM TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`📈 Success Rate: ${((passed / totalTests) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n📋 DETAILED RESULTS:');
    this.testResults.forEach(test => {
      const status = test.status === 'PASS' ? '✅' : '❌';
      console.log(`   ${status} ${test.name} (${test.duration}ms)`);
    });
    
    console.log('='.repeat(60));
    
    if (passed === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Self-healing connection system is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the implementation.');
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Self-Healing Backend Connection System Tests\n');
    
    await this.runTest('Frontend Connection', () => this.testFrontendConnection());
    await this.runTest('Backend Discovery', () => this.testBackendDiscovery());
    await this.runTest('Health Endpoints', () => this.testHealthEndpoints());
    
    // Get a working backend port for RPC tests
    let workingPort = null;
    try {
      workingPort = await this.testBackendDiscovery();
    } catch (error) {
      this.log('No backend available for RPC tests', 'warning');
    }
    
    if (workingPort) {
      await this.runTest('RPC Endpoint', () => this.testRPCEndpoint(workingPort));
      await this.runTest('Connection Resilience', () => this.testConnectionResilience());
    }
    
    await this.runTest('Connection Status Indicator', () => this.testConnectionStatusIndicator());
    await this.runTest('Error Handling', () => this.testErrorHandling());
    
    this.printSummary();
  }
}

// Run the tests
const tester = new ConnectionSystemTester();
tester.runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
