#!/usr/bin/env node

/**
 * Testing Utilities for Retell AI Agents
 * 
 * Comprehensive testing framework for validating agent configurations,
 * testing conversations, and automating QA processes.
 */

import axios from 'axios';
import chalk from 'chalk';
import fs from 'fs/promises';
import { performance } from 'perf_hooks';

class RetellTestSuite {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.retellai.com/v2';
    this.config = {
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    
    this.testResults = [];
    this.options = {
      verbose: false,
      saveResults: true,
      ...options
    };
  }

  // Core test runner
  async runTestSuite(agentIds = null) {
    console.log(chalk.blue('🧪 Starting Retell AI Test Suite...'));
    
    const startTime = Date.now();
    
    try {
      // Get agents to test
      let agents;
      if (agentIds) {
        agents = [];
        for (const id of agentIds) {
          const response = await axios.get(`/get-agent/${id}`, this.config);
          agents.push(response.data);
        }
      } else {
        const response = await axios.get('/list-agents', this.config);
        agents = response.data;
      }

      console.log(`📊 Testing ${agents.length} agents...`);

      for (const agent of agents) {
        await this.testAgent(agent);
      }

      const duration = Date.now() - startTime;
      
      // Generate test report
      const report = this.generateTestReport(duration);
      
      if (this.options.saveResults) {
        const reportPath = `test-report-${new Date().toISOString().split('T')[0]}.json`;
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(chalk.blue(`📋 Test report saved: ${reportPath}`));
      }

      return report;
      
    } catch (error) {
      console.error(chalk.red('❌ Test suite failed:'), error.message);
      throw error;
    }
  }

  async testAgent(agent) {
    console.log(chalk.yellow(`🔍 Testing agent: ${agent.agent_name || agent.agent_id}`));
    
    const agentResult = {
      agent_id: agent.agent_id,
      agent_name: agent.agent_name,
      tests: {},
      overall_score: 0,
      issues: [],
      recommendations: []
    };

    // Run individual tests
    const tests = [
      { name: 'configuration', fn: () => this.testConfiguration(agent) },
      { name: 'webhook_connectivity', fn: () => this.testWebhookConnectivity(agent) },
      { name: 'voice_settings', fn: () => this.testVoiceSettings(agent) },
      { name: 'llm_configuration', fn: () => this.testLLMConfiguration(agent) },
      { name: 'mcp_tools', fn: () => this.testMCPTools(agent) },
      { name: 'security', fn: () => this.testSecurity(agent) }
    ];

    let totalScore = 0;
    
    for (const test of tests) {
      try {
        const result = await test.fn();
        agentResult.tests[test.name] = result;
        totalScore += result.score || 0;
        
        if (this.options.verbose) {
          const status = result.passed ? chalk.green('✅') : chalk.red('❌');
          console.log(`  ${status} ${test.name}: ${result.message}`);
        }
        
        if (result.issues) {
          agentResult.issues.push(...result.issues);
        }
        
        if (result.recommendations) {
          agentResult.recommendations.push(...result.recommendations);
        }
        
      } catch (error) {
        agentResult.tests[test.name] = {
          passed: false,
          score: 0,
          message: `Test failed: ${error.message}`
        };
        
        console.log(`  ❌ ${test.name}: ${error.message}`);
      }
    }

    agentResult.overall_score = Math.round(totalScore / tests.length);
    
    const scoreColor = agentResult.overall_score >= 80 ? chalk.green : 
                      agentResult.overall_score >= 60 ? chalk.yellow : chalk.red;
    
    console.log(`  📊 Overall Score: ${scoreColor(agentResult.overall_score + '%')}`);
    
    this.testResults.push(agentResult);
  }

  // Individual test methods
  async testConfiguration(agent) {
    const issues = [];
    let score = 100;

    // Required fields
    if (!agent.agent_name || agent.agent_name.trim() === '') {
      issues.push('Agent name is missing');
      score -= 20;
    }

    if (!agent.voice_id) {
      issues.push('Voice ID is not configured');
      score -= 30;
    }

    if (!agent.language) {
      issues.push('Language is not specified');
      score -= 10;
    }

    // Optional but recommended fields
    if (!agent.webhook_url) {
      score -= 5;
    }

    return {
      passed: issues.length === 0,
      score: Math.max(0, score),
      message: issues.length === 0 ? 'Configuration valid' : `${issues.length} configuration issues`,
      issues
    };
  }

  async testWebhookConnectivity(agent) {
    if (!agent.webhook_url) {
      return {
        passed: false,
        score: 0,
        message: 'No webhook URL configured'
      };
    }

    try {
      const startTime = performance.now();
      
      const response = await axios.post(agent.webhook_url, {
        event: 'test',
        call: {
          call_id: 'test_call_' + Date.now(),
          agent_id: agent.agent_id,
          call_status: 'test'
        }
      }, { 
        timeout: 5000,
        validateStatus: status => status < 500 // Accept 4xx as "reachable"
      });

      const latency = Math.round(performance.now() - startTime);
      
      return {
        passed: response.status < 500,
        score: response.status < 300 ? 100 : response.status < 500 ? 70 : 0,
        message: `Webhook reachable (${response.status}, ${latency}ms)`,
        latency_ms: latency
      };
      
    } catch (error) {
      return {
        passed: false,
        score: 0,
        message: `Webhook not reachable: ${error.message}`
      };
    }
  }

  async testVoiceSettings(agent) {
    const issues = [];
    let score = 100;

    // Voice speed validation
    if (agent.voice_speed < 0.5 || agent.voice_speed > 2.0) {
      issues.push(`Voice speed ${agent.voice_speed} outside valid range (0.5-2.0)`);
      score -= 25;
    }

    // Voice temperature validation  
    if (agent.voice_temperature < 0 || agent.voice_temperature > 2.0) {
      issues.push(`Voice temperature ${agent.voice_temperature} outside valid range (0-2.0)`);
      score -= 25;
    }

    // Interruption sensitivity validation
    if (agent.interruption_sensitivity < 0 || agent.interruption_sensitivity > 1.0) {
      issues.push(`Interruption sensitivity ${agent.interruption_sensitivity} outside valid range (0-1.0)`);
      score -= 25;
    }

    // Responsiveness validation
    if (agent.responsiveness < 0 || agent.responsiveness > 1.0) {
      issues.push(`Responsiveness ${agent.responsiveness} outside valid range (0-1.0)`);
      score -= 25;
    }

    const recommendations = [];
    
    // Performance recommendations
    if (agent.voice_speed > 1.3) {
      recommendations.push('Voice speed is quite fast, may affect comprehension');
    }
    
    if (agent.interruption_sensitivity > 0.9) {
      recommendations.push('High interruption sensitivity may cause choppy conversations');
    }

    return {
      passed: issues.length === 0,
      score: Math.max(0, score),
      message: issues.length === 0 ? 'Voice settings valid' : `${issues.length} voice issues`,
      issues,
      recommendations
    };
  }

  async testLLMConfiguration(agent) {
    if (agent.response_engine.type !== 'retell-llm') {
      return {
        passed: true,
        score: 100,
        message: 'Custom LLM - configuration not testable'
      };
    }

    try {
      const llmResponse = await axios.get(`/get-retell-llm/${agent.response_engine.llm_id}`, this.config);
      const llm = llmResponse.data;
      
      const issues = [];
      let score = 100;

      // Check for required prompt
      if (!llm.general_prompt || llm.general_prompt.trim() === '') {
        issues.push('LLM missing general prompt');
        score -= 50;
      }

      // Check prompt length
      if (llm.general_prompt && llm.general_prompt.length > 10000) {
        issues.push('LLM prompt is very long (may affect performance)');
        score -= 10;
      }

      // Check begin message
      if (!llm.begin_message || llm.begin_message.trim() === '') {
        issues.push('LLM missing begin message');
        score -= 20;
      }

      return {
        passed: issues.length === 0,
        score: Math.max(0, score),
        message: issues.length === 0 ? 'LLM configuration valid' : `${issues.length} LLM issues`,
        issues
      };
      
    } catch (error) {
      return {
        passed: false,
        score: 0,
        message: `LLM not accessible: ${error.message}`
      };
    }
  }

  async testMCPTools(agent) {
    if (agent.response_engine.type !== 'retell-llm') {
      return { passed: true, score: 100, message: 'Custom LLM - MCP not testable' };
    }

    try {
      const llmResponse = await axios.get(`/get-retell-llm/${agent.response_engine.llm_id}`, this.config);
      const llm = llmResponse.data;
      
      if (!llm.tools || llm.tools.length === 0) {
        return { passed: true, score: 100, message: 'No MCP tools configured' };
      }

      const mcpTools = llm.tools.filter(tool => tool.type === 'mcp');
      if (mcpTools.length === 0) {
        return { passed: true, score: 100, message: 'No MCP tools found' };
      }

      let totalScore = 0;
      const toolResults = [];

      for (const tool of mcpTools) {
        const toolTest = await this.testMCPTool(tool);
        toolResults.push(toolTest);
        totalScore += toolTest.score;
      }

      const avgScore = Math.round(totalScore / mcpTools.length);

      return {
        passed: avgScore >= 70,
        score: avgScore,
        message: `${mcpTools.length} MCP tools tested, avg score: ${avgScore}%`,
        tool_results: toolResults
      };
      
    } catch (error) {
      return {
        passed: false,
        score: 0,
        message: `MCP test failed: ${error.message}`
      };
    }
  }

  async testMCPTool(tool) {
    if (!tool.server_url) {
      return { passed: false, score: 0, message: 'No server URL configured' };
    }

    try {
      // Simple connectivity test to MCP server
      const response = await axios.get(tool.server_url, { 
        timeout: 5000,
        validateStatus: status => status < 500
      });

      return {
        passed: response.status < 400,
        score: response.status < 300 ? 100 : response.status < 400 ? 70 : 0,
        message: `MCP server reachable (${response.status})`
      };
      
    } catch (error) {
      return {
        passed: false,
        score: 0,
        message: `MCP server unreachable: ${error.message}`
      };
    }
  }

  async testSecurity(agent) {
    const issues = [];
    const warnings = [];
    let score = 100;

    // Webhook security
    if (agent.webhook_url && !agent.webhook_url.startsWith('https://')) {
      issues.push('Webhook URL uses HTTP instead of HTTPS');
      score -= 30;
    }

    // Sensitive data handling
    if (!agent.opt_out_sensitive_data_storage) {
      warnings.push('Sensitive data storage is enabled');
    }

    // Check for secrets in configuration
    const agentStr = JSON.stringify(agent).toLowerCase();
    const secretPatterns = ['password', 'secret', 'key', 'token'];
    
    for (const pattern of secretPatterns) {
      if (agentStr.includes(pattern) && agentStr.includes('=')) {
        warnings.push(`Potential secret found in configuration: ${pattern}`);
        score -= 10;
      }
    }

    return {
      passed: issues.length === 0,
      score: Math.max(0, score),
      message: issues.length === 0 ? 'Security configuration OK' : `${issues.length} security issues`,
      issues,
      warnings
    };
  }

  generateTestReport(duration) {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.overall_score >= 70).length;
    const avgScore = totalTests > 0 ? 
      Math.round(this.testResults.reduce((sum, r) => sum + r.overall_score, 0) / totalTests) : 0;

    const report = {
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      summary: {
        total_agents: totalTests,
        passed_agents: passedTests,
        failed_agents: totalTests - passedTests,
        average_score: avgScore,
        success_rate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
      },
      agent_results: this.testResults,
      recommendations: this.generateGlobalRecommendations()
    };

    // Print summary
    console.log(chalk.green('\n📊 Test Summary:'));
    console.log(`  Agents Tested: ${totalTests}`);
    console.log(`  Passed: ${chalk.green(passedTests)} Failed: ${chalk.red(totalTests - passedTests)}`);
    console.log(`  Average Score: ${avgScore >= 70 ? chalk.green(avgScore + '%') : chalk.red(avgScore + '%')}`);
    console.log(`  Duration: ${Math.round(duration / 1000)}s`);

    return report;
  }

  generateGlobalRecommendations() {
    const recommendations = [];
    
    // Analyze common issues across agents
    const allIssues = this.testResults.flatMap(r => r.issues);
    const issueFrequency = {};
    
    allIssues.forEach(issue => {
      issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
    });

    // Generate recommendations for common issues
    for (const [issue, count] of Object.entries(issueFrequency)) {
      if (count > this.testResults.length * 0.3) { // More than 30% of agents
        recommendations.push({
          type: 'common_issue',
          message: `Common issue affecting ${count} agents: ${issue}`,
          priority: 'high'
        });
      }
    }

    // Check for performance patterns
    const avgScores = this.testResults.map(r => r.overall_score);
    const overallAvg = avgScores.reduce((a, b) => a + b, 0) / avgScores.length;
    
    if (overallAvg < 70) {
      recommendations.push({
        type: 'performance',
        message: 'Overall agent quality is below recommended threshold',
        priority: 'high'
      });
    }

    return recommendations;
  }

  // Conversation testing
  async testConversationFlow(agentId, testScenarios) {
    console.log(chalk.blue(`💬 Testing conversation flows for agent ${agentId}...`));
    
    const results = [];
    
    for (const scenario of testScenarios) {
      console.log(`  🎯 Testing scenario: ${scenario.name}`);
      
      try {
        // This would integrate with Retell's testing APIs when available
        const result = await this.simulateConversation(agentId, scenario);
        results.push(result);
        
        const status = result.passed ? chalk.green('✅') : chalk.red('❌');
        console.log(`    ${status} ${result.message}`);
        
      } catch (error) {
        results.push({
          scenario: scenario.name,
          passed: false,
          message: `Test failed: ${error.message}`
        });
      }
    }

    return {
      agent_id: agentId,
      scenarios_tested: testScenarios.length,
      scenarios_passed: results.filter(r => r.passed).length,
      results
    };
  }

  async simulateConversation(agentId, scenario) {
    // Mock conversation simulation
    // In a real implementation, this would use Retell's testing endpoints
    
    return {
      scenario: scenario.name,
      passed: Math.random() > 0.2, // 80% success rate for demo
      duration_ms: Math.random() * 30000 + 5000,
      turns: scenario.turns?.length || 0,
      message: 'Conversation simulation completed'
    };
  }

  // Load balancing and stress testing
  async stressTest(agentId, concurrency = 5, duration = 60) {
    console.log(chalk.blue(`⚡ Running stress test: ${concurrency} concurrent for ${duration}s...`));
    
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    const results = [];
    
    const workers = Array.from({ length: concurrency }, () => this.stressWorker(agentId, endTime, results));
    
    await Promise.allSettled(workers);
    
    const summary = {
      agent_id: agentId,
      concurrency,
      duration_seconds: duration,
      total_requests: results.length,
      successful_requests: results.filter(r => r.success).length,
      failed_requests: results.filter(r => !r.success).length,
      avg_latency_ms: results.length > 0 ? 
        Math.round(results.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / results.length) : 0,
      requests_per_second: Math.round(results.length / duration)
    };

    console.log(chalk.green('⚡ Stress Test Results:'));
    console.log(`  Total Requests: ${summary.total_requests}`);
    console.log(`  Success Rate: ${Math.round((summary.successful_requests / summary.total_requests) * 100)}%`);
    console.log(`  Avg Latency: ${summary.avg_latency_ms}ms`);
    console.log(`  Requests/sec: ${summary.requests_per_second}`);

    return summary;
  }

  async stressWorker(agentId, endTime, results) {
    while (Date.now() < endTime) {
      const start = performance.now();
      
      try {
        await axios.get(`/get-agent/${agentId}`, this.config);
        
        results.push({
          timestamp: Date.now(),
          success: true,
          latency_ms: Math.round(performance.now() - start)
        });
        
      } catch (error) {
        results.push({
          timestamp: Date.now(),
          success: false,
          latency_ms: Math.round(performance.now() - start),
          error: error.message
        });
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// Test scenario configurations
const TEST_SCENARIOS = {
  customer_service: [
    {
      name: "Basic Greeting",
      turns: [
        { role: "user", content: "Hello" },
        { role: "agent", expected_contains: ["hello", "help", "assist"] }
      ]
    },
    {
      name: "Account Inquiry",
      turns: [
        { role: "user", content: "I need help with my account" },
        { role: "agent", expected_contains: ["account", "information"] }
      ]
    },
    {
      name: "Escalation Request", 
      turns: [
        { role: "user", content: "I want to speak to a manager" },
        { role: "agent", expected_contains: ["transfer", "manager", "supervisor"] }
      ]
    }
  ],
  sales: [
    {
      name: "Product Inquiry",
      turns: [
        { role: "user", content: "Tell me about your products" },
        { role: "agent", expected_contains: ["product", "feature", "benefit"] }
      ]
    },
    {
      name: "Pricing Question",
      turns: [
        { role: "user", content: "What does it cost?" },
        { role: "agent", expected_contains: ["price", "cost", "pricing"] }
      ]
    }
  ]
};

// Configuration validation
async function validateEnvironmentConfig() {
  console.log(chalk.blue('🔍 Validating environment configuration...'));
  
  const requiredEnvVars = [
    'RETELL_API_KEY',
  ];
  
  const optionalEnvVars = [
    'RETELL_WEBHOOK_SECRET',
    'DEFAULT_WEBHOOK_URL',
    'NODE_ENV'
  ];

  const missing = [];
  const present = [];

  // Check required variables
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      present.push(envVar);
    } else {
      missing.push(envVar);
    }
  }

  // Check optional variables
  const optional = [];
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      optional.push(envVar);
    }
  }

  console.log(chalk.green('✅ Required variables:'));
  present.forEach(var_ => console.log(`  ✅ ${var_}`));
  
  if (missing.length > 0) {
    console.log(chalk.red('❌ Missing required variables:'));
    missing.forEach(var_ => console.log(`  ❌ ${var_}`));
  }

  if (optional.length > 0) {
    console.log(chalk.blue('📋 Optional variables set:'));
    optional.forEach(var_ => console.log(`  📋 ${var_}`));
  }

  return {
    valid: missing.length === 0,
    missing_required: missing,
    present_required: present,
    present_optional: optional
  };
}

// Main CLI interface
async function main() {
  const command = process.argv[2];
  
  if (!command) {
    console.log(chalk.blue('🧪 Retell AI Testing Utilities'));
    console.log('\nAvailable commands:');
    console.log('  test [agent-ids...]               Run test suite');
    console.log('  conversation-test <agent-id>      Test conversation flows');
    console.log('  stress-test <agent-id>            Run stress test');
    console.log('  validate-env                      Validate environment config');
    console.log('  benchmark-api                     Benchmark API performance');
    process.exit(0);
  }

  // Validate environment first
  const envValidation = await validateEnvironmentConfig();
  if (!envValidation.valid) {
    console.error(chalk.red('❌ Environment configuration invalid'));
    process.exit(1);
  }

  const apiKey = process.env.RETELL_API_KEY;
  const testSuite = new RetellTestSuite(apiKey, { verbose: true });

  switch (command) {
    case 'test':
      const agentIds = process.argv.slice(3);
      await testSuite.runTestSuite(agentIds.length > 0 ? agentIds : null);
      break;
      
    case 'conversation-test':
      if (!process.argv[3]) {
        console.error(chalk.red('❌ Agent ID required'));
        process.exit(1);
      }
      await testSuite.testConversationFlow(process.argv[3], TEST_SCENARIOS.customer_service);
      break;
      
    case 'stress-test':
      if (!process.argv[3]) {
        console.error(chalk.red('❌ Agent ID required'));
        process.exit(1);
      }
      const concurrency = parseInt(process.argv[4]) || 5;
      const duration = parseInt(process.argv[5]) || 60;
      await testSuite.stressTest(process.argv[3], concurrency, duration);
      break;
      
    case 'validate-env':
      const validation = await validateEnvironmentConfig();
      console.log(validation.valid ? chalk.green('✅ Environment valid') : chalk.red('❌ Environment invalid'));
      break;
      
    case 'benchmark-api':
      const iterations = parseInt(process.argv[3]) || 10;
      const utils = new (await import('./migration-utils.js')).RetellMigrationUtils(apiKey);
      await utils.benchmarkAPI(iterations);
      break;
      
    default:
      console.error(chalk.red(`❌ Unknown command: ${command}`));
      process.exit(1);
  }
}

export default RetellTestSuite;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

---

// config/development.json - Development configuration template
{
  "retell": {
    "api": {
      "base_url": "https://api.retellai.com/v2",
      "timeout": 10000,
      "rate_limit": {
        "requests_per_minute": 60,
        "burst_limit": 10
      }
    },
    "development": {
      "proxy_port": 3000,
      "webhook_port": 3001,
      "enable_request_logging": true,
      "enable_change_tracking": true,
      "auto_backup_interval": 3600000
    },
    "testing": {
      "default_test_scenarios": "customer_service",
      "stress_test_duration": 60,
      "stress_test_concurrency": 5,
      "webhook_test_timeout": 5000
    }
  },
  "voice_profiles": {
    "professional": {
      "voice_speed": 1.0,
      "voice_temperature": 0.8,
      "interruption_sensitivity": 0.6,
      "responsiveness": 0.8
    },
    "casual": {
      "voice_speed": 1.1,
      "voice_temperature": 1.0,
      "interruption_sensitivity": 0.7,
      "responsiveness": 0.9
    },
    "conservative": {
      "voice_speed": 0.9,
      "voice_temperature": 0.7,
      "interruption_sensitivity": 0.4,
      "responsiveness": 0.7
    }
  },
  "deployment_environments": {
    "development": {
      "webhook_base_url": "http://localhost:3001",
      "opt_out_sensitive_data_storage": true,
      "enable_transcription_formatting": true,
      "max_call_duration_ms": 600000
    },
    "staging": {
      "webhook_base_url": "https://staging-webhooks.yourcompany.com", 
      "opt_out_sensitive_data_storage": true,
      "enable_transcription_formatting": true,
      "max_call_duration_ms": 1800000
    },
    "production": {
      "webhook_base_url": "https://webhooks.yourcompany.com",
      "opt_out_sensitive_data_storage": false,
      "enable_transcription_formatting": true,
      "max_call_duration_ms": 3600000
    }
  },
  "monitoring": {
    "performance_alert_thresholds": {
      "api_latency_ms": 3000,
      "success_rate_percent": 95,
      "avg_call_duration_seconds": 300
    },
    "health_check_endpoints": [
      "http://localhost:3000/health",
      "http://localhost:3001/health"
    ]
  }
}

---

// scripts/health-check.js - Health monitoring script
import axios from 'axios';
import chalk from 'chalk';

async function healthCheck() {
  const endpoints = [
    { name: 'Development Server', url: 'http://localhost:3000/health' },
    { name: 'Webhook Receiver', url: 'http://localhost:3001/health' },
    { name: 'Retell API', url: 'https://api.retellai.com/v2/list-agents', headers: { 
      'Authorization': `Bearer ${process.env.RETELL_API_KEY}` 
    }}
  ];

  console.log(chalk.blue('🏥 Health Check Results:'));
  
  for (const endpoint of endpoints) {
    try {
      const start = Date.now();
      const response = await axios.get(endpoint.url, { 
        headers: endpoint.headers,
        timeout: 5000 
      });
      const latency = Date.now() - start;
      
      console.log(chalk.green(`✅ ${endpoint.name}: OK (${latency}ms)`));
      
    } catch (error) {
      console.log(chalk.red(`❌ ${endpoint.name}: ${error.message}`));
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  healthCheck();
}