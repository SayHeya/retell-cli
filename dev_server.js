import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

class RetellDevServer {
  constructor(port = 3000, retellApiKey) {
    this.port = port;
    this.retellApiKey = retellApiKey;
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.retellBaseURL = 'https://api.retellai.com/v2';
    
    // Store for development data
    this.callLogs = [];
    this.webhookEvents = [];
    this.agentDiffs = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  getRetellConfig() {
    return {
      baseURL: this.retellBaseURL,
      headers: {
        'Authorization': `Bearer ${this.retellApiKey}`,
        'Content-Type': 'application/json'
      }
    };
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Retell API Proxy with enhanced logging
    this.app.all('/api/retell/*', async (req, res) => {
      try {
        const retellPath = req.path.replace('/api/retell', '');
        const startTime = Date.now();
        
        const config = {
          ...this.getRetellConfig(),
          method: req.method.toLowerCase(),
          url: retellPath,
          data: req.body,
          params: req.query
        };

        const response = await axios(config);
        const duration = Date.now() - startTime;
        
        // Log the request for debugging
        this.logRequest(req, response, duration);
        
        res.status(response.status).json(response.data);
      } catch (error) {
        const duration = Date.now() - Date.now();
        this.logRequest(req, error.response, duration, error);
        
        res.status(error.response?.status || 500).json({
          error: error.response?.data || error.message,
          path: req.path,
          method: req.method
        });
      }
    });

    // Agent comparison endpoint
    this.app.get('/compare-agents/:agent1/:agent2', async (req, res) => {
      try {
        const { agent1, agent2 } = req.params;
        
        const [agent1Data, agent2Data] = await Promise.all([
          this.fetchAgent(agent1),
          this.fetchAgent(agent2)
        ]);

        const comparison = this.compareAgents(agent1Data, agent2Data);
        res.json(comparison);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Agent diff tracking
    this.app.post('/track-changes/:agentId', async (req, res) => {
      try {
        const { agentId } = req.params;
        const currentAgent = await this.fetchAgent(agentId);
        
        if (this.agentDiffs.has(agentId)) {
          const previousAgent = this.agentDiffs.get(agentId);
          const diff = this.generateDiff(previousAgent, currentAgent);
          
          res.json({
            agentId,
            hasChanges: Object.keys(diff).length > 0,
            changes: diff,
            timestamp: new Date().toISOString()
          });
        } else {
          res.json({
            agentId,
            hasChanges: false,
            message: 'No previous version tracked'
          });
        }
        
        // Store current state
        this.agentDiffs.set(agentId, currentAgent);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Webhook simulation endpoint
    this.app.post('/simulate-webhook', (req, res) => {
      const { event, callId, agentId, customData } = req.body;
      
      const webhookPayload = {
        event: event || 'call_started',
        call: {
          call_id: callId || `sim_${Date.now()}`,
          agent_id: agentId || 'test_agent',
          call_status: 'in_progress',
          start_timestamp: Date.now(),
          ...customData
        }
      };

      // Store for debugging
      this.webhookEvents.push({
        ...webhookPayload,
        received_at: new Date().toISOString()
      });

      // Broadcast to connected clients
      this.broadcastToClients('webhook', webhookPayload);

      res.json({ 
        message: 'Webhook simulated successfully',
        payload: webhookPayload 
      });
    });

    // Get development logs
    this.app.get('/dev-logs', (req, res) => {
      const { type } = req.query;
      
      switch (type) {
        case 'calls':
          res.json(this.callLogs);
          break;
        case 'webhooks':
          res.json(this.webhookEvents);
          break;
        case 'diffs':
          res.json(Array.from(this.agentDiffs.entries()));
          break;
        default:
          res.json({
            calls: this.callLogs.slice(-10),
            webhooks: this.webhookEvents.slice(-10),
            tracked_agents: Array.from(this.agentDiffs.keys())
          });
      }
    });

    // Quick agent updates endpoint
    this.app.patch('/quick-update/:agentId', async (req, res) => {
      try {
        const { agentId } = req.params;
        const updates = req.body;
        
        const response = await axios.patch(
          `/update-agent/${agentId}`, 
          updates, 
          this.getRetellConfig()
        );
        
        // Track the change
        if (this.agentDiffs.has(agentId)) {
          const previousAgent = this.agentDiffs.get(agentId);
          const diff = this.generateDiff(previousAgent, response.data);
          
          this.broadcastToClients('agent_updated', {
            agentId,
            changes: diff,
            timestamp: new Date().toISOString()
          });
        }
        
        this.agentDiffs.set(agentId, response.data);
        res.json(response.data);
      } catch (error) {
        res.status(error.response?.status || 500).json({
          error: error.response?.data || error.message
        });
      }
    });

    // Batch operations
    this.app.post('/batch-update', async (req, res) => {
      const { agents, updates } = req.body;
      const results = [];
      
      for (const agentId of agents) {
        try {
          const response = await axios.patch(
            `/update-agent/${agentId}`,
            updates,
            this.getRetellConfig()
          );
          results.push({ agentId, status: 'success', data: response.data });
        } catch (error) {
          results.push({ 
            agentId, 
            status: 'error', 
            error: error.response?.data || error.message 
          });
        }
      }
      
      res.json({ results });
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('Client connected to development WebSocket');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          
          switch (data.type) {
            case 'subscribe':
              ws.subscriptions = data.events || ['all'];
              break;
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
              break;
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected from development WebSocket');
      });
    });
  }

  broadcastToClients(event, data) {
    this.wss.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        if (!client.subscriptions || client.subscriptions.includes('all') || client.subscriptions.includes(event)) {
          client.send(JSON.stringify({
            type: event,
            data,
            timestamp: Date.now()
          }));
        }
      }
    });
  }

  logRequest(req, response, duration, error = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: response?.status || (error ? 'error' : 'unknown'),
      duration: `${duration}ms`,
      body: req.body,
      response: error ? { error: error.message } : response?.data,
      userAgent: req.get('User-Agent')
    };

    this.callLogs.push(logEntry);
    
    // Keep only last 100 logs
    if (this.callLogs.length > 100) {
      this.callLogs = this.callLogs.slice(-100);
    }

    // Broadcast to connected clients
    this.broadcastToClients('api_call', logEntry);
  }

  async fetchAgent(agentId) {
    const response = await axios.get(`/get-agent/${agentId}`, this.getRetellConfig());
    return response.data;
  }

  compareAgents(agent1, agent2) {
    const differences = {};
    const keys = new Set([...Object.keys(agent1), ...Object.keys(agent2)]);
    
    for (const key of keys) {
      if (key === 'agent_id' || key === 'last_modification_timestamp') continue;
      
      if (JSON.stringify(agent1[key]) !== JSON.stringify(agent2[key])) {
        differences[key] = {
          agent1: agent1[key],
          agent2: agent2[key]
        };
      }
    }
    
    return {
      agent1_id: agent1.agent_id,
      agent2_id: agent2.agent_id,
      agent1_name: agent1.agent_name,
      agent2_name: agent2.agent_name,
      differences,
      identical: Object.keys(differences).length === 0
    };
  }

  generateDiff(oldAgent, newAgent) {
    const changes = {};
    const keys = new Set([...Object.keys(oldAgent), ...Object.keys(newAgent)]);
    
    for (const key of keys) {
      if (key === 'last_modification_timestamp' || key === 'version') continue;
      
      const oldValue = oldAgent[key];
      const newValue = newAgent[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = {
          old: oldValue,
          new: newValue,
          type: this.getChangeType(oldValue, newValue)
        };
      }
    }
    
    return changes;
  }

  getChangeType(oldValue, newValue) {
    if (oldValue === undefined) return 'added';
    if (newValue === undefined) return 'removed';
    return 'modified';
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`🚀 Retell AI Development Server running on port ${this.port}`);
      console.log(`📊 Dashboard: http://localhost:${this.port}/dashboard`);
      console.log(`🔗 API Proxy: http://localhost:${this.port}/api/retell/*`);
      console.log(`🔌 WebSocket: ws://localhost:${this.port}`);
      console.log(`📋 Logs: http://localhost:${this.port}/dev-logs`);
      console.log('Press Ctrl+C to stop the server');
    });
  }
}

export default RetellDevServer;

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const apiKey = process.env.RETELL_API_KEY;
  const port = parseInt(process.env.PORT) || 3000;
  
  if (!apiKey) {
    console.error('❌ RETELL_API_KEY environment variable is required');
    process.exit(1);
  }
  
  const server = new RetellDevServer(port, apiKey);
  server.start();
}