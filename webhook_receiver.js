/**
 * Webhook Receiver for Testing Retell AI Integrations
 * 
 * This server receives webhooks from Retell AI agents during development
 * and provides logging, validation, and debugging capabilities.
 */

import express from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

class WebhookReceiver {
  constructor(port = 3001, options = {}) {
    this.port = port;
    this.options = {
      logToFile: options.logToFile !== false,
      validateSignature: options.validateSignature !== false,
      enableCORS: options.enableCORS !== false,
      ...options
    };
    
    this.app = express();
    this.webhookEvents = [];
    this.secretKey = process.env.RETELL_WEBHOOK_SECRET || 'your-webhook-secret';
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Raw body parser for signature validation
    this.app.use('/webhook', express.raw({ type: 'application/json' }));
    this.app.use(express.json());
    
    if (this.options.enableCORS) {
      this.app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Retell-Signature');
        
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
        } else {
          next();
        }
      });
    }

    // Request logging
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`${timestamp} - ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  setupRoutes() {
    // Main webhook endpoint
    this.app.post('/webhook', (req, res) => {
      this.handleWebhook(req, res);
    });

    // Multiple webhook endpoints for testing different agents
    this.app.post('/webhook/:agentId', (req, res) => {
      req.agentId = req.params.agentId;
      this.handleWebhook(req, res);
    });

    // Webhook validation endpoint
    this.app.post('/webhook/validate', (req, res) => {
      const isValid = this.validateSignature(req);
      res.json({ 
        valid: isValid,
        signature: req.get('X-Retell-Signature'),
        timestamp: new Date().toISOString()
      });
    });

    // Event history endpoint
    this.app.get('/events', (req, res) => {
      const { limit = 50, agentId, event } = req.query;
      
      let events = this.webhookEvents;
      
      if (agentId) {
        events = events.filter(e => e.call?.agent_id === agentId);
      }
      
      if (event) {
        events = events.filter(e => e.event === event);
      }
      
      res.json({
        events: events.slice(-limit),
        total: events.length,
        filters: { agentId, event }
      });
    });

    // Event statistics
    this.app.get('/stats', (req, res) => {
      const stats = this.generateStats();
      res.json(stats);
    });

    // Clear events
    this.app.delete('/events', (req, res) => {
      const previousCount = this.webhookEvents.length;
      this.webhookEvents = [];
      res.json({ 
        message: 'Events cleared',
        previousCount,
        currentCount: 0
      });
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        eventsReceived: this.webhookEvents.length,
        memoryUsage: process.memoryUsage()
      });
    });

    // Test endpoint to simulate webhook calls
    this.app.post('/test-send', async (req, res) => {
      const { targetUrl, payload } = req.body;
      
      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Retell-Signature': this.generateSignature(JSON.stringify(payload))
          },
          body: JSON.stringify(payload)
        });

        res.json({
          success: true,
          status: response.status,
          statusText: response.statusText
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }

  async handleWebhook(req, res) {
    try {
      const startTime = Date.now();
      
      // Validate signature if enabled
      if (this.options.validateSignature && !this.validateSignature(req)) {
        console.log('❌ Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Parse the webhook payload
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      // Enrich with metadata
      const event = {
        ...payload,
        received_at: new Date().toISOString(),
        agent_id_from_url: req.agentId,
        source_ip: req.ip,
        user_agent: req.get('User-Agent'),
        processing_time_ms: Date.now() - startTime
      };

      // Store event
      this.webhookEvents.push(event);
      
      // Keep only last 1000 events in memory
      if (this.webhookEvents.length > 1000) {
        this.webhookEvents = this.webhookEvents.slice(-1000);
      }

      // Log to console
      this.logWebhookEvent(event);
      
      // Log to file if enabled
      if (this.options.logToFile) {
        await this.logToFile(event);
      }

      // Process specific event types
      await this.processEventType(event);

      // Respond quickly to Retell
      res.status(200).json({
        received: true,
        event_id: event.call?.call_id || 'unknown',
        timestamp: event.received_at
      });

    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  validateSignature(req) {
    const signature = req.get('X-Retell-Signature');
    if (!signature) return false;

    const body = req.body.toString();
    const expectedSignature = this.generateSignature(body);
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  generateSignature(body) {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(body, 'utf8')
      .digest('hex');
  }

  logWebhookEvent(event) {
    const timestamp = new Date(event.received_at).toLocaleTimeString();
    const eventType = event.event;
    const callId = event.call?.call_id || 'N/A';
    const agentId = event.call?.agent_id || 'N/A';
    
    console.log(`📞 [${timestamp}] ${eventType} - Call: ${callId} - Agent: ${agentId}`);
    
    // Log additional details based on event type
    switch (eventType) {
      case 'call_started':
        console.log(`   📱 From: ${event.call.from_number} To: ${event.call.to_number}`);
        break;
      case 'call_ended':
        const duration = Math.round((event.call.end_timestamp - event.call.start_timestamp) / 1000);
        console.log(`   ⏱️  Duration: ${duration}s - Status: ${event.call.call_status}`);
        break;
      case 'call_analyzed':
        console.log(`   📊 Analysis completed for call ${callId}`);
        break;
    }
  }

  async logToFile(event) {
    try {
      const logsDir = 'logs';
      await fs.mkdir(logsDir, { recursive: true });
      
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(logsDir, `webhook-${date}.log`);
      
      const logEntry = JSON.stringify(event) + '\n';
      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      console.error('Failed to log to file:', error);
    }
  }

  async processEventType(event) {
    switch (event.event) {
      case 'call_started':
        await this.handleCallStarted(event);
        break;
      case 'call_ended':
        await this.handleCallEnded(event);
        break;
      case 'call_analyzed':
        await this.handleCallAnalyzed(event);
        break;
    }
  }

  async handleCallStarted(event) {
    // Log call start details
    console.log(`🟢 Call started: ${event.call.call_id}`);
    
    // You can add custom logic here:
    // - Update CRM systems
    // - Start call recording
    // - Initialize analytics tracking
  }

  async handleCallEnded(event) {
    const call = event.call;
    const duration = call.end_timestamp - call.start_timestamp;
    
    console.log(`🔴 Call ended: ${call.call_id} (${Math.round(duration / 1000)}s)`);
    
    // Example post-call processing:
    if (call.transcript) {
      console.log(`📝 Transcript length: ${call.transcript.length} characters`);
    }
    
    if (call.post_call_analysis) {
      console.log(`📊 Analysis data:`, JSON.stringify(call.post_call_analysis, null, 2));
    }

    // You can add custom logic here:
    // - Update CRM with call results
    // - Trigger follow-up workflows  
    // - Generate reports
    // - Send notifications
  }

  async handleCallAnalyzed(event) {
    console.log(`🧠 Call analysis completed: ${event.call.call_id}`);
    
    // You can add custom logic here:
    // - Store analysis results
    // - Update agent performance metrics
    // - Trigger automated follow-ups
  }

  generateStats() {
    const now = Date.now();
    const last24h = this.webhookEvents.filter(e => 
      now - new Date(e.received_at).getTime() < 24 * 60 * 60 * 1000
    );
    
    const eventTypes = {};
    const agentStats = {};
    const hourlyStats = {};

    this.webhookEvents.forEach(event => {
      // Count by event type
      eventTypes[event.event] = (eventTypes[event.event] || 0) + 1;
      
      // Count by agent
      const agentId = event.call?.agent_id;
      if (agentId) {
        agentStats[agentId] = (agentStats[agentId] || 0) + 1;
      }
      
      // Hourly distribution
      const hour = new Date(event.received_at).getHours();
      hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
    });

    return {
      total_events: this.webhookEvents.length,
      events_last_24h: last24h.length,
      event_types: eventTypes,
      agent_distribution: agentStats,
      hourly_distribution: hourlyStats,
      uptime_seconds: Math.round(process.uptime()),
      memory_usage: process.memoryUsage()
    };
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🎯 Webhook receiver running on port ${this.port}`);
      console.log(`📊 Stats endpoint: http://localhost:${this.port}/stats`);
      console.log(`📜 Events endpoint: http://localhost:${this.port}/events`);
      console.log(`🔍 Health check: http://localhost:${this.port}/health`);
      console.log(`🎣 Webhook endpoint: http://localhost:${this.port}/webhook`);
      console.log(`📱 Agent-specific: http://localhost:${this.port}/webhook/{agentId}`);
      console.log('Press Ctrl+C to stop');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down webhook receiver...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down webhook receiver...');
      process.exit(0);
    });
  }
}

// Export for use as module
export default WebhookReceiver;

// Run directly if executed
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT) || 3001;
  const options = {
    logToFile: true,
    validateSignature: process.env.VALIDATE_SIGNATURE !== 'false'
  };
  
  const receiver = new WebhookReceiver(port, options);
  receiver.start();
}