#!/usr/bin/env node

import { Command } from 'commander';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RetellCLI {
  constructor() {
    this.baseURL = 'https://api.retellai.com/v2';
    this.configPath = path.join(process.cwd(), '.retellrc.json');
    this.config = {};
    this.program = new Command();
  }

  async loadConfig() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
    } catch (error) {
      this.config = {};
    }
  }

  async saveConfig() {
    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
  }

  get apiKey() {
    return this.config.apiKey || process.env.RETELL_API_KEY;
  }

  getAxiosConfig() {
    return {
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    };
  }

  // Configuration Commands
  async configureAPI() {
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your Retell AI API key:',
        mask: '*'
      },
      {
        type: 'input',
        name: 'defaultWebhookUrl',
        message: 'Enter default webhook URL (optional):'
      }
    ]);

    this.config = { ...this.config, ...answers };
    await this.saveConfig();
    console.log(chalk.green('✅ Configuration saved successfully!'));
  }

  // Agent Management Commands
  async listAgents() {
    const spinner = ora('Fetching agents...').start();
    
    try {
      const response = await axios.get('/list-agents', this.getAxiosConfig());
      spinner.stop();

      const table = new Table({
        head: ['Agent ID', 'Name', 'Version', 'Published', 'Voice ID', 'Language'],
        colWidths: [35, 20, 10, 12, 20, 10]
      });

      response.data.forEach(agent => {
        table.push([
          agent.agent_id,
          agent.agent_name || 'N/A',
          agent.version,
          agent.is_published ? '✅' : '❌',
          agent.voice_id,
          agent.language
        ]);
      });

      console.log(table.toString());
      console.log(chalk.blue(`\nTotal agents: ${response.data.length}`));
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Error fetching agents:'), error.response?.data || error.message);
    }
  }

  async getAgent(agentId, version = null) {
    const spinner = ora(`Fetching agent ${agentId}...`).start();
    
    try {
      const url = version ? `/get-agent/${agentId}?version=${version}` : `/get-agent/${agentId}`;
      const response = await axios.get(url, this.getAxiosConfig());
      spinner.stop();

      console.log(chalk.green('Agent Details:'));
      console.log(JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Error fetching agent:'), error.response?.data || error.message);
      return null;
    }
  }

  async duplicateAgent(sourceAgentId, newName) {
    const spinner = ora('Duplicating agent...').start();
    
    try {
      // First, get the source agent
      const sourceAgent = await this.getAgent(sourceAgentId);
      if (!sourceAgent) {
        spinner.stop();
        return;
      }

      spinner.text = 'Creating duplicate agent...';
      
      // Remove fields that shouldn't be copied
      const { agent_id, version, last_modification_timestamp, ...agentData } = sourceAgent;
      
      // Set new name
      agentData.agent_name = newName;
      
      // Create new agent
      const response = await axios.post('/create-agent', agentData, this.getAxiosConfig());
      spinner.stop();

      console.log(chalk.green(`✅ Agent duplicated successfully!`));
      console.log(chalk.blue(`Original Agent ID: ${sourceAgentId}`));
      console.log(chalk.blue(`New Agent ID: ${response.data.agent_id}`));
      console.log(chalk.blue(`New Agent Name: ${newName}`));
      
      return response.data;
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Error duplicating agent:'), error.response?.data || error.message);
    }
  }

  async updateAgent(agentId, updates) {
    const spinner = ora(`Updating agent ${agentId}...`).start();
    
    try {
      const response = await axios.patch(`/update-agent/${agentId}`, updates, this.getAxiosConfig());
      spinner.stop();

      console.log(chalk.green('✅ Agent updated successfully!'));
      console.log(JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Error updating agent:'), error.response?.data || error.message);
    }
  }

  async deleteAgent(agentId) {
    const confirm = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message: `Are you sure you want to delete agent ${agentId}?`,
      default: false
    }]);

    if (!confirm.confirmed) {
      console.log(chalk.yellow('Operation cancelled.'));
      return;
    }

    const spinner = ora(`Deleting agent ${agentId}...`).start();
    
    try {
      await axios.delete(`/delete-agent/${agentId}`, this.getAxiosConfig());
      spinner.stop();

      console.log(chalk.green(`✅ Agent ${agentId} deleted successfully!`));
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Error deleting agent:'), error.response?.data || error.message);
    }
  }

  // LLM Management Commands
  async listLLMs() {
    const spinner = ora('Fetching LLMs...').start();
    
    try {
      const response = await axios.get('/list-retell-llms', this.getAxiosConfig());
      spinner.stop();

      const table = new Table({
        head: ['LLM ID', 'Model Name', 'Version', 'General Prompt', 'Tools'],
        colWidths: [35, 20, 10, 40, 15]
      });

      response.data.forEach(llm => {
        const tools = llm.tools?.length || 0;
        const prompt = llm.general_prompt ? 
          (llm.general_prompt.length > 35 ? llm.general_prompt.substring(0, 35) + '...' : llm.general_prompt) : 
          'N/A';
        
        table.push([
          llm.llm_id,
          llm.model_name || 'N/A',
          llm.version,
          prompt,
          tools
        ]);
      });

      console.log(table.toString());
      console.log(chalk.blue(`\nTotal LLMs: ${response.data.length}`));
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Error fetching LLMs:'), error.response?.data || error.message);
    }
  }

  async getLLM(llmId, version = null) {
    const spinner = ora(`Fetching LLM ${llmId}...`).start();
    
    try {
      const url = version ? `/get-retell-llm/${llmId}?version=${version}` : `/get-retell-llm/${llmId}`;
      const response = await axios.get(url, this.getAxiosConfig());
      spinner.stop();

      console.log(chalk.green('LLM Details:'));
      console.log(JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Error fetching LLM:'), error.response?.data || error.message);
      return null;
    }
  }

  // Interactive Editor Commands
  async editAgentPrompt(agentId) {
    const agent = await this.getAgent(agentId);
    if (!agent) return;

    if (agent.response_engine.type !== 'retell-llm') {
      console.log(chalk.yellow('This agent uses a custom LLM. Use edit-llm command instead.'));
      return;
    }

    const llm = await this.getLLM(agent.response_engine.llm_id);
    if (!llm) return;

    const answers = await inquirer.prompt([
      {
        type: 'editor',
        name: 'generalPrompt',
        message: 'Edit the general prompt:',
        default: llm.general_prompt
      },
      {
        type: 'editor',
        name: 'beginMessage',
        message: 'Edit the begin message:',
        default: llm.begin_message
      }
    ]);

    const updates = {
      general_prompt: answers.generalPrompt,
      begin_message: answers.beginMessage
    };

    await this.updateLLM(llm.llm_id, updates);
  }

  async updateLLM(llmId, updates) {
    const spinner = ora(`Updating LLM ${llmId}...`).start();
    
    try {
      const response = await axios.patch(`/update-retell-llm/${llmId}`, updates, this.getAxiosConfig());
      spinner.stop();

      console.log(chalk.green('✅ LLM updated successfully!'));
      return response.data;
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Error updating LLM:'), error.response?.data || error.message);
    }
  }

  async editMCPSettings(agentId) {
    const agent = await this.getAgent(agentId);
    if (!agent) return;

    console.log(chalk.yellow('Note: MCP settings are managed at the LLM level in Retell AI'));
    
    if (agent.response_engine.type !== 'retell-llm') {
      console.log(chalk.yellow('This agent uses a custom LLM. MCP settings must be configured in your custom LLM implementation.'));
      return;
    }

    const llm = await this.getLLM(agent.response_engine.llm_id);
    if (!llm) return;

    // Display current tools if any
    if (llm.tools && llm.tools.length > 0) {
      console.log(chalk.blue('Current MCP Tools:'));
      llm.tools.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name} (${tool.type})`);
        if (tool.description) {
          console.log(`   Description: ${tool.description}`);
        }
      });
    } else {
      console.log(chalk.yellow('No MCP tools currently configured.'));
    }

    const action = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        'Add new MCP tool',
        'Edit existing MCP tool',
        'Remove MCP tool',
        'View MCP configuration',
        'Cancel'
      ]
    }]);

    if (action.action === 'Cancel') return;

    // Handle different actions based on selection
    switch (action.action) {
      case 'Add new MCP tool':
        await this.addMCPTool(llm);
        break;
      case 'Edit existing MCP tool':
        await this.editMCPTool(llm);
        break;
      case 'Remove MCP tool':
        await this.removeMCPTool(llm);
        break;
      case 'View MCP configuration':
        console.log(JSON.stringify(llm.tools || [], null, 2));
        break;
    }
  }

  async addMCPTool(llm) {
    const toolConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Tool name:',
        validate: input => input.length > 0
      },
      {
        type: 'list',
        name: 'type',
        message: 'Tool type:',
        choices: ['mcp', 'custom_function', 'transfer_call', 'book_appointment_cal']
      },
      {
        type: 'input',
        name: 'description',
        message: 'Tool description:'
      }
    ]);

    if (toolConfig.type === 'mcp') {
      const mcpConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'server_url',
          message: 'MCP Server URL:',
          validate: input => input.startsWith('http')
        },
        {
          type: 'input',
          name: 'tool_name',
          message: 'MCP Tool Name:'
        }
      ]);

      toolConfig.server_url = mcpConfig.server_url;
      toolConfig.tool_name = mcpConfig.tool_name;
    }

    // Add tool to LLM
    const updatedTools = [...(llm.tools || []), toolConfig];
    await this.updateLLM(llm.llm_id, { tools: updatedTools });
  }

  // Template Management
  async saveAgentAsTemplate(agentId, templateName) {
    const agent = await this.getAgent(agentId);
    if (!agent) return;

    const template = {
      name: templateName,
      agent_data: agent,
      created_at: new Date().toISOString()
    };

    const templatesPath = path.join(process.cwd(), 'retell-templates.json');
    let templates = {};

    try {
      const existing = await fs.readFile(templatesPath, 'utf8');
      templates = JSON.parse(existing);
    } catch (error) {
      // File doesn't exist, start fresh
    }

    templates[templateName] = template;
    await fs.writeFile(templatesPath, JSON.stringify(templates, null, 2));

    console.log(chalk.green(`✅ Agent saved as template: ${templateName}`));
  }

  async createFromTemplate(templateName, newAgentName) {
    const templatesPath = path.join(process.cwd(), 'retell-templates.json');
    
    try {
      const templatesData = await fs.readFile(templatesPath, 'utf8');
      const templates = JSON.parse(templatesData);
      
      if (!templates[templateName]) {
        console.log(chalk.red(`Template "${templateName}" not found.`));
        return;
      }

      const template = templates[templateName];
      const { agent_id, version, last_modification_timestamp, ...agentData } = template.agent_data;
      
      agentData.agent_name = newAgentName;

      const spinner = ora('Creating agent from template...').start();
      const response = await axios.post('/create-agent', agentData, this.getAxiosConfig());
      spinner.stop();

      console.log(chalk.green(`✅ Agent created from template!`));
      console.log(chalk.blue(`New Agent ID: ${response.data.agent_id}`));
      console.log(chalk.blue(`Agent Name: ${newAgentName}`));
      
    } catch (error) {
      console.error(chalk.red('Error creating agent from template:'), error.message);
    }
  }

  async listTemplates() {
    const templatesPath = path.join(process.cwd(), 'retell-templates.json');
    
    try {
      const templatesData = await fs.readFile(templatesPath, 'utf8');
      const templates = JSON.parse(templatesData);
      
      const table = new Table({
        head: ['Template Name', 'Original Agent Name', 'Created At'],
        colWidths: [25, 25, 30]
      });

      Object.entries(templates).forEach(([name, template]) => {
        table.push([
          name,
          template.agent_data.agent_name || 'N/A',
          new Date(template.created_at).toLocaleString()
        ]);
      });

      console.log(table.toString());
    } catch (error) {
      console.log(chalk.yellow('No templates found. Create some with: retell save-template <agent-id> <template-name>'));
    }
  }

  // Development Proxy Commands
  async startProxy(port = 3000) {
    const express = await import('express');
    const app = express.default();
    
    app.use(express.default.json());
    
    // CORS middleware
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Proxy all requests to Retell AI
    app.use('/api/retell/*', async (req, res) => {
      try {
        const retellPath = req.path.replace('/api/retell', '');
        const config = {
          ...this.getAxiosConfig(),
          method: req.method.toLowerCase(),
          url: retellPath,
          data: req.body,
          params: req.query
        };

        const response = await axios(config);
        res.status(response.status).json(response.data);
      } catch (error) {
        res.status(error.response?.status || 500).json({
          error: error.response?.data || error.message
        });
      }
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.listen(port, () => {
      console.log(chalk.green(`🚀 Retell AI Development Proxy running on port ${port}`));
      console.log(chalk.blue(`Health check: http://localhost:${port}/health`));
      console.log(chalk.blue(`Proxy endpoint: http://localhost:${port}/api/retell/*`));
      console.log(chalk.yellow('Press Ctrl+C to stop the proxy'));
    });
  }

  // Webhook testing
  async testWebhook(url) {
    const testPayload = {
      event: "call_started",
      call: {
        call_id: "test_call_123",
        agent_id: "test_agent_456",
        call_status: "in_progress",
        start_timestamp: Date.now()
      }
    };

    try {
      const response = await axios.post(url, testPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      console.log(chalk.green(`✅ Webhook test successful!`));
      console.log(`Status: ${response.status}`);
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.error(chalk.red('Webhook test failed:'), error.message);
    }
  }

  setupCommands() {
    this.program
      .name('retell')
      .description('Retell AI CLI for agent management and development')
      .version('1.0.0');

    // Configuration commands
    this.program
      .command('config')
      .description('Configure API credentials')
      .action(() => this.configureAPI());

    // Agent commands
    this.program
      .command('list-agents')
      .description('List all agents')
      .action(() => this.listAgents());

    this.program
      .command('get-agent <agent-id>')
      .description('Get agent details')
      .option('-v, --version <version>', 'Agent version')
      .action((agentId, options) => this.getAgent(agentId, options.version));

    this.program
      .command('duplicate-agent <agent-id> <new-name>')
      .description('Duplicate an existing agent')
      .action((agentId, newName) => this.duplicateAgent(agentId, newName));

    this.program
      .command('edit-prompt <agent-id>')
      .description('Edit agent prompt interactively')
      .action((agentId) => this.editAgentPrompt(agentId));

    this.program
      .command('edit-mcp <agent-id>')
      .description('Edit MCP settings for an agent')
      .action((agentId) => this.editMCPSettings(agentId));

    this.program
      .command('delete-agent <agent-id>')
      .description('Delete an agent')
      .action((agentId) => this.deleteAgent(agentId));

    // LLM commands
    this.program
      .command('list-llms')
      .description('List all LLM response engines')
      .action(() => this.listLLMs());

    this.program
      .command('get-llm <llm-id>')
      .description('Get LLM details')
      .option('-v, --version <version>', 'LLM version')
      .action((llmId, options) => this.getLLM(llmId, options.version));

    // Template commands
    this.program
      .command('save-template <agent-id> <template-name>')
      .description('Save agent as template')
      .action((agentId, templateName) => this.saveAgentAsTemplate(agentId, templateName));

    this.program
      .command('create-from-template <template-name> <agent-name>')
      .description('Create agent from template')
      .action((templateName, agentName) => this.createFromTemplate(templateName, agentName));

    this.program
      .command('list-templates')
      .description('List saved templates')
      .action(() => this.listTemplates());

    // Development commands
    this.program
      .command('proxy')
      .description('Start development proxy server')
      .option('-p, --port <port>', 'Proxy port', '3000')
      .action((options) => this.startProxy(parseInt(options.port)));

    this.program
      .command('test-webhook <url>')
      .description('Test webhook endpoint')
      .action((url) => this.testWebhook(url));
  }

  async run() {
    await this.loadConfig();
    
    if (!this.apiKey && process.argv.length > 2 && process.argv[2] !== 'config') {
      console.log(chalk.red('❌ No API key configured. Please run: retell config'));
      process.exit(1);
    }

    this.setupCommands();
    this.program.parse();
  }
}

// Main execution
const cli = new RetellCLI();
cli.run().catch(console.error);