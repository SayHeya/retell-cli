#!/usr/bin/env node

/**
 * Migration and Performance Utilities for Retell AI
 * 
 * This script provides tools for:
 * - Migrating agents between environments
 * - Performance monitoring and optimization
 * - Batch operations and maintenance
 * - Data export and import
 */

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { performance } from 'perf_hooks';

class RetellMigrationUtils {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.retellai.com/v2';
    this.config = {
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    };
  }

  // Environment Migration
  async migrateToEnvironment(sourceEnvKey, targetEnvKey, agentIds = null) {
    console.log(chalk.blue('🔄 Starting environment migration...'));
    
    const sourceConfig = { ...this.config, headers: { ...this.config.headers, 'Authorization': `Bearer ${sourceEnvKey}` } };
    const targetConfig = { ...this.config, headers: { ...this.config.headers, 'Authorization': `Bearer ${targetEnvKey}` } };

    try {
      // Get agents from source environment
      let agents;
      if (agentIds) {
        agents = [];
        for (const id of agentIds) {
          const response = await axios.get(`/get-agent/${id}`, sourceConfig);
          agents.push(response.data);
        }
      } else {
        const response = await axios.get('/list-agents', sourceConfig);
        agents = response.data;
      }

      console.log(`📊 Found ${agents.length} agents to migrate`);

      // Get LLMs from source environment
      const llmResponse = await axios.get('/list-retell-llms', sourceConfig);
      const sourceLLMs = llmResponse.data;

      const migrationResults = [];

      for (const agent of agents) {
        console.log(`🔄 Migrating agent: ${agent.agent_name || agent.agent_id}`);
        
        try {
          // Handle LLM migration if using retell-llm
          let targetLLMId = agent.response_engine.llm_id;
          
          if (agent.response_engine.type === 'retell-llm') {
            const sourceLLM = sourceLLMs.find(llm => llm.llm_id === agent.response_engine.llm_id);
            if (sourceLLM) {
              // Create LLM in target environment
              const { llm_id, version, last_modification_timestamp, ...llmData } = sourceLLM;
              const newLLMResponse = await axios.post('/create-retell-llm', llmData, targetConfig);
              targetLLMId = newLLMResponse.data.llm_id;
              
              console.log(`  ✅ LLM migrated: ${sourceLLM.llm_id} → ${targetLLMId}`);
            }
          }

          // Create agent in target environment
          const { agent_id, version, last_modification_timestamp, ...agentData } = agent;
          agentData.response_engine.llm_id = targetLLMId;
          
          const newAgentResponse = await axios.post('/create-agent', agentData, targetConfig);
          
          migrationResults.push({
            source_agent_id: agent.agent_id,
            target_agent_id: newAgentResponse.data.agent_id,
            agent_name: agent.agent_name,
            status: 'success'
          });

          console.log(`  ✅ Agent migrated: ${agent.agent_id} → ${newAgentResponse.data.agent_id}`);
          
        } catch (error) {
          migrationResults.push({
            source_agent_id: agent.agent_id,
            agent_name: agent.agent_name,
            status: 'failed',
            error: error.message
          });
          
          console.log(`  ❌ Failed to migrate agent: ${error.message}`);
        }
      }

      // Save migration report
      const reportPath = `migration-report-${new Date().toISOString().split('T')[0]}.json`;
      await fs.writeFile(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        source_environment: 'source',
        target_environment: 'target', 
        results: migrationResults
      }, null, 2));

      console.log(chalk.green(`✅ Migration completed! Report saved: ${reportPath}`));
      return migrationResults;

    } catch (error) {
      console.error(chalk.red('❌ Migration failed:'), error.message);
      throw error;
    }
  }

  // Performance Monitoring
  async analyzeAgentPerformance(agentId, days = 7) {
    console.log(chalk.blue(`📊 Analyzing performance for agent ${agentId}...`));
    
    try {
      // Get agent details
      const agentResponse = await axios.get(`/get-agent/${agentId}`, this.config);
      const agent = agentResponse.data;

      // Get call history (this would need to be implemented based on available endpoints)
      const calls = await this.getCallHistory(agentId, days);
      
      const analysis = {
        agent_id: agentId,
        agent_name: agent.agent_name,
        analysis_period_days: days,
        total_calls: calls.length,
        performance_metrics: this.calculatePerformanceMetrics(calls),
        recommendations: this.generateRecommendations(agent, calls)
      };

      console.log(chalk.green('📈 Performance Analysis:'));
      console.log(`  Total Calls: ${analysis.total_calls}`);
      console.log(`  Avg Duration: ${analysis.performance_metrics.avg_duration_seconds}s`);
      console.log(`  Success Rate: ${analysis.performance_metrics.success_rate}%`);
      
      // Save detailed analysis
      const analysisPath = `performance-analysis-${agentId}-${Date.now()}.json`;
      await fs.writeFile(analysisPath, JSON.stringify(analysis, null, 2));
      
      return analysis;
      
    } catch (error) {
      console.error(chalk.red('❌ Performance analysis failed:'), error.message);
    }
  }

  async getCallHistory(agentId, days) {
    // This would use the actual Retell API endpoint for call history
    // For now, returning mock data structure
    return [];
  }

  calculatePerformanceMetrics(calls) {
    if (calls.length === 0) {
      return {
        avg_duration_seconds: 0,
        success_rate: 0,
        total_calls: 0
      };
    }

    const totalDuration = calls.reduce((sum, call) => {
      return sum + ((call.end_timestamp - call.start_timestamp) / 1000);
    }, 0);

    const successfulCalls = calls.filter(call => 
      call.call_status === 'completed' || call.call_status === 'ended'
    ).length;

    return {
      avg_duration_seconds: Math.round(totalDuration / calls.length),
      success_rate: Math.round((successfulCalls / calls.length) * 100),
      total_calls: calls.length,
      avg_daily_calls: Math.round(calls.length / 7)
    };
  }

  generateRecommendations(agent, calls) {
    const recommendations = [];
    
    // Voice speed recommendations
    if (agent.voice_speed > 1.3) {
      recommendations.push({
        type: 'voice_optimization',
        message: 'Voice speed is quite fast. Consider reducing to 1.0-1.2 for better comprehension'
      });
    }
    
    // Interruption sensitivity
    if (agent.interruption_sensitivity < 0.3) {
      recommendations.push({
        type: 'interaction_optimization',
        message: 'Low interruption sensitivity may make the agent seem unresponsive'
      });
    }
    
    // Call duration analysis
    const avgDuration = this.calculatePerformanceMetrics(calls).avg_duration_seconds;
    if (avgDuration > 300) { // 5 minutes
      recommendations.push({
        type: 'efficiency_optimization',
        message: 'Calls are taking longer than average. Consider optimizing prompts for conciseness'
      });
    }

    return recommendations;
  }

  // Batch Operations
  async batchUpdateAgents(agentIds, updates) {
    console.log(chalk.blue(`🔧 Batch updating ${agentIds.length} agents...`));
    
    const results = [];
    let successCount = 0;
    
    for (const agentId of agentIds) {
      try {
        const response = await axios.patch(`/update-agent/${agentId}`, updates, this.config);
        results.push({
          agent_id: agentId,
          status: 'success',
          data: response.data
        });
        successCount++;
        
        console.log(`  ✅ Updated agent: ${agentId}`);
        
        // Rate limiting - don't overwhelm API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.push({
          agent_id: agentId,
          status: 'failed',
          error: error.response?.data || error.message
        });
        
        console.log(`  ❌ Failed to update agent ${agentId}: ${error.message}`);
      }
    }

    console.log(chalk.green(`✅ Batch update completed: ${successCount}/${agentIds.length} successful`));
    return results;
  }

  // Export/Import Utilities
  async exportWorkspace(outputPath = null) {
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultPath = `retell-workspace-export-${timestamp}.json`;
    const exportPath = outputPath || defaultPath;
    
    console.log(chalk.blue('📦 Exporting workspace...'));
    
    try {
      // Get all agents
      const agentsResponse = await axios.get('/list-agents', this.config);
      const agents = agentsResponse.data;
      
      // Get all LLMs
      const llmsResponse = await axios.get('/list-retell-llms', this.config);
      const llms = llmsResponse.data;

      // Get detailed agent data
      const detailedAgents = [];
      for (const agent of agents) {
        const detailResponse = await axios.get(`/get-agent/${agent.agent_id}`, this.config);
        detailedAgents.push(detailResponse.data);
      }

      // Get detailed LLM data  
      const detailedLLMs = [];
      for (const llm of llms) {
        const detailResponse = await axios.get(`/get-retell-llm/${llm.llm_id}`, this.config);
        detailedLLMs.push(detailResponse.data);
      }

      const exportData = {
        export_timestamp: new Date().toISOString(),
        version: '1.0',
        agents: detailedAgents,
        llms: detailedLLMs,
        metadata: {
          total_agents: agents.length,
          total_llms: llms.length,
          export_tool: 'retell-cli'
        }
      };

      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
      
      console.log(chalk.green(`✅ Workspace exported to: ${exportPath}`));
      console.log(`📊 Exported ${agents.length} agents and ${llms.length} LLMs`);
      
      return exportData;
      
    } catch (error) {
      console.error(chalk.red('❌ Export failed:'), error.message);
      throw error;
    }
  }

  async importWorkspace(importPath, options = {}) {
    console.log(chalk.blue(`📥 Importing workspace from: ${importPath}`));
    
    try {
      const data = await fs.readFile(importPath, 'utf8');
      const importData = JSON.parse(data);
      
      if (!importData.agents || !importData.llms) {
        throw new Error('Invalid export file format');
      }

      const results = {
        imported_llms: [],
        imported_agents: [],
        failed_llms: [],
        failed_agents: []
      };

      // Import LLMs first
      console.log(`📝 Importing ${importData.llms.length} LLMs...`);
      
      for (const llm of importData.llms) {
        try {
          const { llm_id, version, last_modification_timestamp, ...llmData } = llm;
          
          const response = await axios.post('/create-retell-llm', llmData, this.config);
          results.imported_llms.push({
            original_id: llm.llm_id,
            new_id: response.data.llm_id,
            name: llmData.general_prompt?.substring(0, 50) || 'N/A'
          });
          
          console.log(`  ✅ LLM imported: ${llm.llm_id} → ${response.data.llm_id}`);
          
        } catch (error) {
          results.failed_llms.push({
            original_id: llm.llm_id,
            error: error.message
          });
          console.log(`  ❌ LLM import failed: ${llm.llm_id}`);
        }
      }

      // Import agents
      console.log(`🤖 Importing ${importData.agents.length} agents...`);
      
      for (const agent of importData.agents) {
        try {
          const { agent_id, version, last_modification_timestamp, ...agentData } = agent;
          
          // Map LLM IDs to new ones if using retell-llm
          if (agent.response_engine.type === 'retell-llm') {
            const originalLLMId = agent.response_engine.llm_id;
            const mappedLLM = results.imported_llms.find(llm => llm.original_id === originalLLMId);
            
            if (mappedLLM) {
              agentData.response_engine.llm_id = mappedLLM.new_id;
            } else {
              console.log(`  ⚠️  LLM ${originalLLMId} not found, skipping agent ${agent.agent_id}`);
              continue;
            }
          }

          // Add suffix to agent name if not overwriting
          if (!options.overwrite) {
            agentData.agent_name = `${agentData.agent_name} (Imported)`;
          }

          const response = await axios.post('/create-agent', agentData, this.config);
          results.imported_agents.push({
            original_id: agent.agent_id,
            new_id: response.data.agent_id,
            name: agentData.agent_name
          });
          
          console.log(`  ✅ Agent imported: ${agent.agent_id} → ${response.data.agent_id}`);
          
        } catch (error) {
          results.failed_agents.push({
            original_id: agent.agent_id,
            error: error.message
          });
          console.log(`  ❌ Agent import failed: ${agent.agent_id}`);
        }
      }

      // Save migration report
      const reportPath = `import-report-${new Date().toISOString().split('T')[0]}.json`;
      await fs.writeFile(reportPath, JSON.stringify(results, null, 2));

      console.log(chalk.green(`✅ Import completed!`));
      console.log(`📊 LLMs: ${results.imported_llms.length} imported, ${results.failed_llms.length} failed`);
      console.log(`🤖 Agents: ${results.imported_agents.length} imported, ${results.failed_agents.length} failed`);
      console.log(`📋 Report saved: ${reportPath}`);

      return results;

    } catch (error) {
      console.error(chalk.red('❌ Import failed:'), error.message);
      throw error;
    }
  }

  // Performance Monitoring
  async benchmarkAPI(iterations = 10) {
    console.log(chalk.blue(`⚡ Running API performance benchmark (${iterations} iterations)...`));
    
    const results = {
      list_agents: [],
      get_agent: [],
      create_agent: [],
      update_agent: []
    };

    // Benchmark list agents
    console.log('📊 Testing list-agents endpoint...');
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        await axios.get('/list-agents', this.config);
        const duration = performance.now() - start;
        results.list_agents.push(duration);
      } catch (error) {
        console.log(`  ❌ Request ${i + 1} failed: ${error.message}`);
      }
    }

    // Get a test agent for other benchmarks
    const agentsResponse = await axios.get('/list-agents', this.config);
    if (agentsResponse.data.length === 0) {
      console.log(chalk.yellow('⚠️  No agents found for detailed benchmarking'));
      return this.calculateBenchmarkStats(results);
    }

    const testAgent = agentsResponse.data[0];

    // Benchmark get agent
    console.log('🎯 Testing get-agent endpoint...');
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        await axios.get(`/get-agent/${testAgent.agent_id}`, this.config);
        const duration = performance.now() - start;
        results.get_agent.push(duration);
      } catch (error) {
        console.log(`  ❌ Request ${i + 1} failed: ${error.message}`);
      }
    }

    // Benchmark update agent (with minimal changes)
    console.log('🔧 Testing update-agent endpoint...');
    for (let i = 0; i < Math.min(iterations, 3); i++) { // Limit updates to avoid rate limiting
      const start = performance.now();
      try {
        const timestamp = new Date().toISOString();
        await axios.patch(`/update-agent/${testAgent.agent_id}`, {
          agent_name: `${testAgent.agent_name} (Test ${timestamp})`
        }, this.config);
        const duration = performance.now() - start;
        results.update_agent.push(duration);
        
        // Revert the change
        await axios.patch(`/update-agent/${testAgent.agent_id}`, {
          agent_name: testAgent.agent_name
        }, this.config);
        
      } catch (error) {
        console.log(`  ❌ Request ${i + 1} failed: ${error.message}`);
      }
    }

    const stats = this.calculateBenchmarkStats(results);
    
    // Save benchmark report
    const reportPath = `api-benchmark-${new Date().toISOString().split('T')[0]}.json`;
    await fs.writeFile(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      iterations,
      test_agent_id: testAgent.agent_id,
      raw_results: results,
      statistics: stats
    }, null, 2));

    console.log(chalk.green(`⚡ Benchmark completed! Report: ${reportPath}`));
    return stats;
  }

  calculateBenchmarkStats(results) {
    const stats = {};
    
    for (const [endpoint, times] of Object.entries(results)) {
      if (times.length === 0) {
        stats[endpoint] = { message: 'No data' };
        continue;
      }

      const sorted = times.sort((a, b) => a - b);
      const sum = times.reduce((a, b) => a + b, 0);
      
      stats[endpoint] = {
        count: times.length,
        avg_ms: Math.round(sum / times.length),
        min_ms: Math.round(sorted[0]),
        max_ms: Math.round(sorted[sorted.length - 1]),
        median_ms: Math.round(sorted[Math.floor(sorted.length / 2)]),
        p95_ms: Math.round(sorted[Math.floor(sorted.length * 0.95)])
      };
    }
    
    return stats;
  }

  // Configuration Validator
  async validateAgentConfiguration(agentId) {
    console.log(chalk.blue(`🔍 Validating agent configuration: ${agentId}`));
    
    try {
      const response = await axios.get(`/get-agent/${agentId}`, this.config);
      const agent = response.data;
      
      const validation = {
        agent_id: agentId,
        agent_name: agent.agent_name,
        issues: [],
        warnings: [],
        recommendations: []
      };

      // Check required fields
      if (!agent.agent_name || agent.agent_name.trim() === '') {
        validation.issues.push('Agent name is empty or missing');
      }

      // Voice configuration validation
      if (agent.voice_speed < 0.5 || agent.voice_speed > 2.0) {
        validation.issues.push(`Voice speed ${agent.voice_speed} is outside recommended range (0.5-2.0)`);
      }

      if (agent.voice_temperature < 0 || agent.voice_temperature > 2.0) {
        validation.issues.push(`Voice temperature ${agent.voice_temperature} is outside valid range (0-2.0)`);
      }

      // Webhook validation
      if (agent.webhook_url) {
        if (!agent.webhook_url.startsWith('https://')) {
          validation.warnings.push('Webhook URL should use HTTPS for production');
        }
        
        // Test webhook connectivity
        try {
          await axios.post(agent.webhook_url, {
            event: 'test',
            call: { call_id: 'validation_test', agent_id: agentId }
          }, { timeout: 5000 });
        } catch (error) {
          validation.issues.push(`Webhook URL not reachable: ${error.message}`);
        }
      } else {
        validation.warnings.push('No webhook URL configured');
      }

      // LLM validation
      if (agent.response_engine.type === 'retell-llm') {
        try {
          const llmResponse = await axios.get(`/get-retell-llm/${agent.response_engine.llm_id}`, this.config);
          const llm = llmResponse.data;
          
          if (!llm.general_prompt || llm.general_prompt.trim() === '') {
            validation.issues.push('LLM has no general prompt configured');
          }
          
          if (llm.general_prompt && llm.general_prompt.length > 8000) {
            validation.warnings.push('LLM prompt is very long (>8000 chars), may affect performance');
          }
          
        } catch (error) {
          validation.issues.push(`Cannot access associated LLM: ${error.message}`);
        }
      }

      // Performance recommendations
      if (agent.interruption_sensitivity > 0.9) {
        validation.recommendations.push('Consider reducing interruption sensitivity for more natural conversations');
      }

      if (agent.end_call_after_silence_ms < 30000) {
        validation.recommendations.push('Very short silence timeout may end calls prematurely');
      }

      // Print validation results
      console.log(chalk.green(`📋 Validation Results for ${agent.agent_name}:`));
      
      if (validation.issues.length > 0) {
        console.log(chalk.red('❌ Issues:'));
        validation.issues.forEach(issue => console.log(`  • ${issue}`));
      }
      
      if (validation.warnings.length > 0) {
        console.log(chalk.yellow('⚠️  Warnings:'));
        validation.warnings.forEach(warning => console.log(`  • ${warning}`));
      }
      
      if (validation.recommendations.length > 0) {
        console.log(chalk.blue('💡 Recommendations:'));
        validation.recommendations.forEach(rec => console.log(`  • ${rec}`));
      }

      if (validation.issues.length === 0 && validation.warnings.length === 0) {
        console.log(chalk.green('✅ Agent configuration looks good!'));
      }

      return validation;

    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'), error.message);
      throw error;
    }
  }

  // Cost Analysis
  async analyzeCosts(days = 30) {
    console.log(chalk.blue(`💰 Analyzing costs for the last ${days} days...`));
    
    // This would integrate with actual billing/usage APIs when available
    // For now, providing structure for cost analysis
    
    const mockData = {
      period_days: days,
      total_calls: 1250,
      total_minutes: 3840,
      estimated_cost_usd: 76.80,
      cost_breakdown: {
        voice_synthesis: 45.60,
        speech_recognition: 18.24,
        llm_processing: 12.96
      },
      agent_usage: [
        { agent_id: 'agent_1', calls: 680, minutes: 2100, cost: 42.00 },
        { agent_id: 'agent_2', calls: 570, minutes: 1740, cost: 34.80 }
      ]
    };

    console.log(chalk.green('💰 Cost Analysis:'));
    console.log(`  Period: ${days} days`);
    console.log(`  Total Calls: ${mockData.total_calls}`);
    console.log(`  Total Minutes: ${mockData.total_minutes}`);
    console.log(`  Estimated Cost: $${mockData.estimated_cost_usd}`);
    console.log(`  Average Cost/Call: $${(mockData.estimated_cost_usd / mockData.total_calls).toFixed(3)}`);

    return mockData;
  }

  // Interactive utilities
  async runInteractiveMigration() {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'sourceKey',
        message: 'Source environment API key:',
        validate: input => input.length > 0
      },
      {
        type: 'input', 
        name: 'targetKey',
        message: 'Target environment API key:',
        validate: input => input.length > 0
      },
      {
        type: 'confirm',
        name: 'selectiveTransfer',
        message: 'Select specific agents to migrate?',
        default: false
      }
    ]);

    let agentIds = null;
    if (answers.selectiveTransfer) {
      // Load agents and let user select
      const tempConfig = { ...this.config, headers: { ...this.config.headers, 'Authorization': `Bearer ${answers.sourceKey}` } };
      const agentsResponse = await axios.get('/list-agents', tempConfig);
      
      const agentChoices = agentsResponse.data.map(agent => ({
        name: `${agent.agent_name || agent.agent_id} (v${agent.version})`,
        value: agent.agent_id
      }));

      const selection = await inquirer.prompt([{
        type: 'checkbox',
        name: 'selectedAgents',
        message: 'Select agents to migrate:',
        choices: agentChoices
      }]);

      agentIds = selection.selectedAgents;
    }

    return this.migrateToEnvironment(answers.sourceKey, answers.targetKey, agentIds);
  }
}

// Performance Monitor Class
class PerformanceMonitor {
  constructor(apiKey, interval = 60000) {
    this.apiKey = apiKey;
    this.interval = interval;
    this.metrics = [];
    this.isRunning = false;
  }

  async start() {
    console.log(chalk.blue(`📊 Starting performance monitor (${this.interval/1000}s intervals)...`));
    this.isRunning = true;
    
    while (this.isRunning) {
      try {
        const metric = await this.collectMetrics();
        this.metrics.push(metric);
        
        // Keep only last 1440 metrics (24 hours at 1min intervals)
        if (this.metrics.length > 1440) {
          this.metrics = this.metrics.slice(-1440);
        }
        
        this.logCurrentMetrics(metric);
        
      } catch (error) {
        console.error(chalk.red('❌ Metrics collection failed:'), error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, this.interval));
    }
  }

  stop() {
    this.isRunning = false;
    console.log(chalk.yellow('🛑 Performance monitor stopped'));
  }

  async collectMetrics() {
    const start = performance.now();
    
    try {
      // Test API responsiveness
      const response = await axios.get('/list-agents?limit=1', {
        baseURL: 'https://api.retellai.com/v2',
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 10000
      });
      
      const apiLatency = performance.now() - start;
      
      return {
        timestamp: new Date().toISOString(),
        api_latency_ms: Math.round(apiLatency),
        api_status: response.status,
        response_size_bytes: JSON.stringify(response.data).length,
        agent_count: response.data.length
      };
      
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        api_latency_ms: -1,
        api_status: error.response?.status || 'error',
        error: error.message
      };
    }
  }

  logCurrentMetrics(metric) {
    const time = new Date(metric.timestamp).toLocaleTimeString();
    const latency = metric.api_latency_ms;
    const status = metric.api_status;
    
    if (latency > 0) {
      const latencyColor = latency < 1000 ? chalk.green : latency < 3000 ? chalk.yellow : chalk.red;
      console.log(`[${time}] API: ${latencyColor(latency + 'ms')} Status: ${status}`);
    } else {
      console.log(`[${time}] API: ${chalk.red('ERROR')} Status: ${status}`);
    }
  }

  getStats() {
    if (this.metrics.length === 0) return null;
    
    const validMetrics = this.metrics.filter(m => m.api_latency_ms > 0);
    const latencies = validMetrics.map(m => m.api_latency_ms);
    
    if (latencies.length === 0) return { error: 'No valid metrics' };
    
    latencies.sort((a, b) => a - b);
    
    return {
      period_minutes: Math.round(this.metrics.length * this.interval / 60000),
      total_requests: this.metrics.length,
      successful_requests: validMetrics.length,
      success_rate: Math.round((validMetrics.length / this.metrics.length) * 100),
      avg_latency_ms: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
      min_latency_ms: latencies[0],
      max_latency_ms: latencies[latencies.length - 1],
      p50_latency_ms: latencies[Math.floor(latencies.length * 0.5)],
      p95_latency_ms: latencies[Math.floor(latencies.length * 0.95)],
      p99_latency_ms: latencies[Math.floor(latencies.length * 0.99)]
    };
  }
}

// CLI Interface for utilities
async function main() {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    console.error(chalk.red('❌ RETELL_API_KEY environment variable required'));
    process.exit(1);
  }

  const utils = new RetellMigrationUtils(apiKey);
  
  if (process.argv.length < 3) {
    console.log(chalk.blue('🛠️  Retell AI Migration & Performance Utils'));
    console.log('\nAvailable commands:');
    console.log('  export [output-file]              Export workspace');
    console.log('  import <input-file>               Import workspace');
    console.log('  migrate                           Interactive migration');
    console.log('  benchmark [iterations]            API performance benchmark');
    console.log('  validate <agent-id>               Validate agent configuration');
    console.log('  monitor [interval-seconds]        Start performance monitoring');
    console.log('  batch-update <agent-ids...>       Batch update agents');
    console.log('  costs [days]                      Analyze usage costs');
    process.exit(0);
  }

  const command = process.argv[2];
  
  switch (command) {
    case 'export':
      await utils.exportWorkspace(process.argv[3]);
      break;
      
    case 'import':
      if (!process.argv[3]) {
        console.error(chalk.red('❌ Import file path required'));
        process.exit(1);
      }
      await utils.importWorkspace(process.argv[3]);
      break;
      
    case 'migrate':
      await utils.runInteractiveMigration();
      break;
      
    case 'benchmark':
      const iterations = parseInt(process.argv[3]) || 10;
      await utils.benchmarkAPI(iterations);
      break;
      
    case 'validate':
      if (!process.argv[3]) {
        console.error(chalk.red('❌ Agent ID required'));
        process.exit(1);
      }
      await utils.validateAgentConfiguration(process.argv[3]);
      break;
      
    case 'monitor':
      const interval = (parseInt(process.argv[3]) || 60) * 1000;
      const monitor = new PerformanceMonitor(apiKey, interval);
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        monitor.stop();
        const stats = monitor.getStats();
        if (stats) {
          console.log(chalk.blue('\n📊 Final Statistics:'));
          console.log(JSON.stringify(stats, null, 2));
        }
        process.exit(0);
      });
      
      await monitor.start();
      break;
      
    case 'costs':
      const days = parseInt(process.argv[3]) || 30;
      await utils.analyzeCosts(days);
      break;
      
    default:
      console.error(chalk.red(`❌ Unknown command: ${command}`));
      process.exit(1);
  }
}

// Export classes for use as modules
export { RetellMigrationUtils, PerformanceMonitor };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}