#!/usr/bin/env node
/**
 * Retell AI Development Automation Script
 * 
 * This script demonstrates common development workflows using the Retell CLI.
 * It shows how to automate agent management, testing, and deployment.
 */

import { RetellCLI } from './index.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

class RetellDevWorkflow {
  constructor() {
    this.cli = new RetellCLI();
  }

  async init() {
    await this.cli.loadConfig();
    
    if (!this.cli.apiKey) {
      console.log(chalk.red('❌ No API key configured. Please run the configuration first.'));
      await this.cli.configureAPI();
    }
  }

  // Development workflow for creating test variations
  async createTestVariations(productionAgentId) {
    console.log(chalk.blue('🔧 Creating test variations from production agent...'));
    
    // Get production agent
    const productionAgent = await this.cli.getAgent(productionAgentId);
    if (!productionAgent) {
      throw new Error('Production agent not found');
    }

    // Define test variations
    const variations = [
      {
        name: `${productionAgent.agent_name} - Speed Test`,
        updates: {
          voice_speed: 1.3,
          responsiveness: 0.8
        }
      },
      {
        name: `${productionAgent.agent_name} - Conservative`,
        updates: {
          interruption_sensitivity: 0.3,
          voice_temperature: 0.7
        }
      },
      {
        name: `${productionAgent.agent_name} - Aggressive`,
        updates: {
          interruption_sensitivity: 0.9,
          responsiveness: 1.0
        }
      }
    ];

    const createdAgents = [];

    for (const variation of variations) {
      console.log(chalk.yellow(`Creating: ${variation.name}`));
      
      // Duplicate the agent
      const newAgent = await this.cli.duplicateAgent(productionAgentId, variation.name);
      if (newAgent) {
        // Apply variation updates
        const updatedAgent = await this.cli.updateAgent(newAgent.agent_id, variation.updates);
        createdAgents.push({
          ...updatedAgent,
          variation: variation.name
        });
        
        console.log(chalk.green(`✅ Created: ${variation.name} (${newAgent.agent_id})`));
      }
    }

    return createdAgents;
  }

  // Setup MCP connections for multiple agents
  async setupMCPConnections(agentIds, mcpConfig) {
    console.log(chalk.blue('🔗 Setting up MCP connections...'));
    
    const results = [];

    for (const agentId of agentIds) {
      try {
        const agent = await this.cli.getAgent(agentId);
        
        if (agent.response_engine.type === 'retell-llm') {
          const llm = await this.cli.getLLM(agent.response_engine.llm_id);
          
          // Add MCP tools to the LLM
          const updatedTools = [
            ...(llm.tools || []),
            {
              type: 'mcp',
              name: mcpConfig.name,
              description: mcpConfig.description,
              server_url: mcpConfig.server_url,
              tool_name: mcpConfig.tool_name,
              headers: mcpConfig.headers || {},
              query_params: mcpConfig.query_params || {}
            }
          ];

          await this.cli.updateLLM(llm.llm_id, { tools: updatedTools });
          
          results.push({
            agent_id: agentId,
            status: 'success',
            message: `MCP tool '${mcpConfig.name}' added`
          });
          
          console.log(chalk.green(`✅ MCP configured for agent: ${agentId}`));
        } else {
          results.push({
            agent_id: agentId,
            status: 'skipped',
            message: 'Agent uses custom LLM'
          });
        }
      } catch (error) {
        results.push({
          agent_id: agentId,
          status: 'error',
          message: error.message
        });
        console.log(chalk.red(`❌ Failed to configure MCP for agent: ${agentId}`));
      }
    }

    return results;
  }

  // Automated testing workflow
  async runTestSuite(testAgents) {
    console.log(chalk.blue('🧪 Running automated test suite...'));
    
    const testResults = [];

    for (const agent of testAgents) {
      console.log(chalk.yellow(`Testing agent: ${agent.agent_name}`));
      
      // Test 1: Webhook connectivity
      const webhookTest = await this.testWebhookConnectivity(agent);
      
      // Test 2: Voice configuration validation
      const voiceTest = await this.validateVoiceConfig(agent);
      
      // Test 3: LLM response validation
      const llmTest = await this.validateLLMConfig(agent);
      
      const overallResult = {
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        tests: {
          webhook: webhookTest,
          voice: voiceTest,
          llm: llmTest
        },
        passed: webhookTest.passed && voiceTest.passed && llmTest.passed
      };
      
      testResults.push(overallResult);
      
      const status = overallResult.passed ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED');
      console.log(`${status} ${agent.agent_name}`);
    }

    return testResults;
  }

  async testWebhookConnectivity(agent) {
    if (!agent.webhook_url) {
      return { passed: false, message: 'No webhook URL configured' };
    }

    try {
      // Simple connectivity test
      const response = await fetch(agent.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          call: { call_id: 'test', agent_id: agent.agent_id }
        }),
        timeout: 5000
      });

      return { 
        passed: response.ok, 
        message: `HTTP ${response.status}` 
      };
    } catch (error) {
      return { 
        passed: false, 
        message: error.message 
      };
    }
  }

  async validateVoiceConfig(agent) {
    const issues = [];
    
    // Check voice settings are within valid ranges
    if (agent.voice_speed < 0.5 || agent.voice_speed > 2) {
      issues.push('Voice speed out of valid range (0.5-2)');
    }
    
    if (agent.voice_temperature < 0 || agent.voice_temperature > 2) {
      issues.push('Voice temperature out of valid range (0-2)');
    }
    
    if (agent.interruption_sensitivity < 0 || agent.interruption_sensitivity > 1) {
      issues.push('Interruption sensitivity out of valid range (0-1)');
    }

    // Check voice ID is valid
    const validVoiceIds = [
      '11labs-Adrian', '11labs-Amy', '11labs-Brian',
      'openai-Alloy', 'openai-Echo', 'openai-Fable',
      'deepgram-Angus', 'deepgram-Stella'
    ];
    
    if (!validVoiceIds.includes(agent.voice_id)) {
      issues.push('Unknown voice ID');
    }

    return {
      passed: issues.length === 0,
      message: issues.length > 0 ? issues.join(', ') : 'Voice configuration valid'
    };
  }

  async validateLLMConfig(agent) {
    try {
      if (agent.response_engine.type === 'retell-llm') {
        const llm = await this.cli.getLLM(agent.response_engine.llm_id);
        
        const issues = [];
        
        if (!llm.general_prompt || llm.general_prompt.trim().length === 0) {
          issues.push('No general prompt configured');
        }
        
        if (llm.general_prompt && llm.general_prompt.length > 5000) {
          issues.push('General prompt is very long (>5000 chars)');
        }

        return {
          passed: issues.length === 0,
          message: issues.length > 0 ? issues.join(', ') : 'LLM configuration valid'
        };
      } else {
        return { passed: true, message: 'Custom LLM - validation skipped' };
      }
    } catch (error) {
      return { passed: false, message: `LLM validation failed: ${error.message}` };
    }
  }

  // Deployment preparation workflow
  async prepareForDeployment(stagingAgentId) {
    console.log(chalk.blue('🚀 Preparing agent for deployment...'));
    
    const agent = await this.cli.getAgent(stagingAgentId);
    if (!agent) {
      throw new Error('Staging agent not found');
    }

    // Deployment checklist
    const checklist = [
      {
        name: 'Webhook URL configured',
        check: () => agent.webhook_url && agent.webhook_url.startsWith('https://')
      },
      {
        name: 'Production voice settings',
        check: () => agent.voice_speed >= 0.8 && agent.voice_speed <= 1.2
      },
      {
        name: 'Appropriate sensitivity settings',
        check: () => agent.interruption_sensitivity >= 0.3 && agent.interruption_sensitivity <= 0.8
      },
      {
        name: 'Language specified',
        check: () => agent.language && agent.language !== ''
      },
      {
        name: 'Agent name is descriptive',
        check: () => agent.agent_name && agent.agent_name.length > 5
      }
    ];

    console.log(chalk.yellow('📋 Deployment Checklist:'));
    
    let allPassed = true;
    for (const item of checklist) {
      const passed = item.check();
      const status = passed ? chalk.green('✅') : chalk.red('❌');
      console.log(`${status} ${item.name}`);
      if (!passed) allPassed = false;
    }

    if (allPassed) {
      console.log(chalk.green('\n🎉 Agent is ready for deployment!'));
      
      // Offer to publish
      const shouldPublish = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmed',
        message: 'Would you like to publish this agent?',
        default: false
      }]);

      if (shouldPublish.confirmed) {
        await this.cli.updateAgent(stagingAgentId, { is_published: true });
        console.log(chalk.green('✅ Agent published successfully!'));
      }
    } else {
      console.log(chalk.red('\n⚠️  Please fix the issues above before deployment.'));
    }

    return allPassed;
  }

  // Interactive workflow selector
  async runInteractiveWorkflow() {
    const workflow = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        'Create test variations from production agent',
        'Setup MCP connections for multiple agents',
        'Run test suite on agents',
        'Prepare agent for deployment',
        'Quick agent duplication',
        'Batch update agent settings',
        'Export agent configuration',
        'Exit'
      ]
    }]);

    switch (workflow.action) {
      case 'Create test variations from production agent':
        await this.workflowCreateTestVariations();
        break;
      case 'Setup MCP connections for multiple agents':
        await this.workflowSetupMCP();
        break;
      case 'Run test suite on agents':
        await this.workflowRunTests();
        break;
      case 'Prepare agent for deployment':
        await this.workflowPrepareDeployment();
        break;
      case 'Quick agent duplication':
        await this.workflowQuickDuplicate();
        break;
      case 'Batch update agent settings':
        await this.workflowBatchUpdate();
        break;
      case 'Export agent configuration':
        await this.workflowExportConfig();
        break;
      default:
        console.log(chalk.yellow('👋 Goodbye!'));
        process.exit(0);
    }

    // Offer to run another workflow
    const runAnother = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message: 'Run another workflow?',
      default: true
    }]);

    if (runAnother.confirmed) {
      await this.runInteractiveWorkflow();
    }
  }

  async workflowCreateTestVariations() {
    const agents = await this.getAgentChoices();
    
    const answers = await inquirer.prompt([{
      type: 'list',
      name: 'agentId',
      message: 'Select production agent:',
      choices: agents
    }]);

    await this.createTestVariations(answers.agentId);
  }

  async workflowSetupMCP() {
    const mcpConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'MCP Tool Name:',
        validate: input => input.length > 0
      },
      {
        type: 'input',
        name: 'description',
        message: 'Tool Description:'
      },
      {
        type: 'input',
        name: 'server_url',
        message: 'MCP Server URL:',
        validate: input => input.startsWith('http')
      },
      {
        type: 'input',
        name: 'tool_name',
        message: 'Specific Tool Name:'
      }
    ]);

    const agents = await this.getAgentChoices();
    const agentSelection = await inquirer.prompt([{
      type: 'checkbox',
      name: 'agentIds',
      message: 'Select agents to configure:',
      choices: agents
    }]);

    await this.setupMCPConnections(agentSelection.agentIds, mcpConfig);
  }

  async workflowPrepareDeployment() {
    const agents = await this.getAgentChoices();
    
    const answers = await inquirer.prompt([{
      type: 'list',
      name: 'agentId',
      message: 'Select agent for deployment:',
      choices: agents
    }]);

    await this.prepareForDeployment(answers.agentId);
  }

  async getAgentChoices() {
    try {
      const response = await fetch('/api/retell/list-agents', {
        headers: {
          'Authorization': `Bearer ${this.cli.apiKey}`
        }
      });
      
      if (!response.ok) {
        // Fallback to direct API call
        const axios = (await import('axios')).default;
        const apiResponse = await axios.get('/list-agents', this.cli.getAxiosConfig());
        const agents = apiResponse.data;
        
        return agents.map(agent => ({
          name: `${agent.agent_name || agent.agent_id} (v${agent.version})`,
          value: agent.agent_id
        }));
      }

      const agents = await response.json();
      return agents.map(agent => ({
        name: `${agent.agent_name || agent.agent_id} (v${agent.version})`,
        value: agent.agent_id
      }));
    } catch (error) {
      console.error('Failed to load agents for selection:', error);
      return [];
    }
  }

  // Example: Automated A/B testing setup
  async setupABTesting(baseAgentId) {
    console.log(chalk.blue('🔬 Setting up A/B testing environment...'));
    
    const testConfigs = [
      {
        name: 'Variant A - Conservative',
        webhook_url: 'https://your-webhook.com/variant-a',
        voice_speed: 0.9,
        interruption_sensitivity: 0.4,
        responsiveness: 0.7
      },
      {
        name: 'Variant B - Aggressive', 
        webhook_url: 'https://your-webhook.com/variant-b',
        voice_speed: 1.1,
        interruption_sensitivity: 0.8,
        responsiveness: 0.9
      }
    ];

    const variants = [];

    for (const config of testConfigs) {
      const { name, ...updates } = config;
      
      // Create variant
      const variant = await this.cli.duplicateAgent(baseAgentId, name);
      if (variant) {
        // Apply A/B test configuration
        await this.cli.updateAgent(variant.agent_id, updates);
        variants.push(variant);
        
        console.log(chalk.green(`✅ Created A/B variant: ${name}`));
      }
    }

    // Save A/B test configuration
    const abConfig = {
      base_agent_id: baseAgentId,
      variants: variants.map(v => ({
        agent_id: v.agent_id,
        name: v.agent_name,
        webhook_url: v.webhook_url
      })),
      created_at: new Date().toISOString()
    };

    await fs.writeFile('ab-test-config.json', JSON.stringify(abConfig, null, 2));
    console.log(chalk.blue('📊 A/B test configuration saved to ab-test-config.json'));

    return variants;
  }

  // Development server management
  async startDevelopmentEnvironment(port = 3000) {
    console.log(chalk.blue('🚀 Starting development environment...'));
    
    // Start the development server
    const DevServer = (await import('./dev-server.js')).default;
    const server = new DevServer(port, this.cli.apiKey);
    
    server.start();
    
    console.log(chalk.green(`✅ Development server started on port ${port}`));
    console.log(chalk.blue(`📊 Dashboard: http://localhost:${port}/dashboard`));
    
    return server;
  }
}

// Example usage functions
async function exampleCreateAndTest() {
  const workflow = new RetellDevWorkflow();
  await workflow.init();
  
  // Example: Create test variations from a production agent
  const productionAgentId = 'your-production-agent-id';
  const testVariations = await workflow.createTestVariations(productionAgentId);
  
  // Setup MCP connections for all test variations
  const mcpConfig = {
    name: 'customer_lookup',
    description: 'Look up customer information',
    server_url: 'https://your-mcp-server.com',
    tool_name: 'lookup_customer',
    headers: {
      'Authorization': 'Bearer your-mcp-token'
    }
  };
  
  const agentIds = testVariations.map(agent => agent.agent_id);
  await workflow.setupMCPConnections(agentIds, mcpConfig);
  
  // Run tests
  const testResults = await workflow.runTestSuite(testVariations);
  
  console.log(chalk.blue('\n📊 Test Results Summary:'));
  testResults.forEach(result => {
    const status = result.passed ? chalk.green('✅') : chalk.red('❌');
    console.log(`${status} ${result.agent_name}`);
  });
}

async function exampleABTesting() {
  const workflow = new RetellDevWorkflow();
  await workflow.init();
  
  const baseAgentId = 'your-base-agent-id';
  const variants = await workflow.setupABTesting(baseAgentId);
  
  console.log(chalk.green(`\n🎯 A/B test setup complete with ${variants.length} variants`));
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const workflow = new RetellDevWorkflow();
  
  if (process.argv.length > 2) {
    const command = process.argv[2];
    
    switch (command) {
      case 'create-test-variations':
        await workflow.init();
        const agentId = process.argv[3];
        if (!agentId) {
          console.log(chalk.red('Usage: node example.js create-test-variations <agent-id>'));
          process.exit(1);
        }
        await workflow.createTestVariations(agentId);
        break;
        
      case 'ab-test':
        await workflow.init();
        const baseId = process.argv[3];
        if (!baseId) {
          console.log(chalk.red('Usage: node example.js ab-test <base-agent-id>'));
          process.exit(1);
        }
        await workflow.setupABTesting(baseId);
        break;
        
      case 'dev-server':
        const port = parseInt(process.argv[3]) || 3000;
        await workflow.startDevelopmentEnvironment(port);
        break;
        
      default:
        console.log(chalk.yellow('Available commands:'));
        console.log('  create-test-variations <agent-id>');
        console.log('  ab-test <agent-id>');
        console.log('  dev-server [port]');
        console.log('  interactive');
    }
  } else {
    await workflow.init();
    await workflow.runInteractiveWorkflow();
  }
}