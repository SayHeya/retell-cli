# Retell AI Development Toolkit - Complete Setup Guide

This comprehensive toolkit provides everything you need for rapid Retell AI agent development, including CLI management, local development proxy, testing utilities, and MCP integration tools.

## 🚀 Quick Start

```bash
# 1. Setup the project
git clone <your-repo> retell-dev-toolkit
cd retell-dev-toolkit

# 2. Run the setup script
chmod +x setup.sh
./setup.sh

# 3. Configure your API key
./index.js config
# Or set environment variable:
export RETELL_API_KEY="your_retell_api_key"

# 4. Start development environment
./start-dev.sh
```

## 📦 What's Included

### Core Tools
- **CLI Tool** (`index.js`) - Complete agent management from command line
- **Development Server** (`dev-server.js`) - Local proxy with enhanced debugging
- **Web Dashboard** (`dashboard.html`) - Visual interface for agent management
- **Webhook Receiver** (`webhook-receiver.js`) - Local webhook testing server
- **Migration Utils** (`migration-utils.js`) - Environment migration and performance tools
- **Test Suite** (`test-utils.js`) - Comprehensive testing framework

### Configuration & Templates
- **MCP Templates** (`mcp-configs.json`) - Ready-to-use MCP integrations
- **Agent Templates** - Pre-configured agent types (customer service, sales, etc.)
- **Environment Configs** - Development, staging, and production settings

### Automation Scripts
- **Setup Script** (`setup.sh`) - One-command project setup
- **Development Starter** (`start-dev.sh`) - Launch complete dev environment
- **Health Checks** (`health-check.js`) - Monitor system health
- **Backup Tools** (`backup-agents.js`) - Automated backups

## 🛠️ Core Workflows

### 1. Agent Development Workflow

```bash
# List existing agents
retell list-agents

# Duplicate production agent for testing
retell duplicate-agent prod_agent_123 "Test Agent - Voice Speed"

# Edit the duplicated agent
retell edit-prompt test_agent_456
retell edit-mcp test_agent_456

# Test the configuration
node test-utils.js test test_agent_456

# Deploy when ready
retell update-agent test_agent_456 '{"is_published": true}'
```

### 2. MCP Integration Setup

```bash
# Start with MCP configuration
retell edit-mcp <agent-id>

# The CLI will guide you through:
# 1. Adding MCP server connections
# 2. Configuring authentication headers
# 3. Setting up tool mappings
# 4. Testing connectivity
```

**Example MCP Configuration for Zapier:**
```json
{
  "name": "zapier_automation",
  "description": "Trigger Zapier workflows",
  "server_url": "https://api.zapier.com/mcp",
  "tool_name": "trigger_zap",
  "headers": {
    "Authorization": "Bearer your_zapier_token"
  },
  "query_params": {
    "workspace_id": "your_workspace_id"
  }
}
```

### 3. Development Environment

Start the complete development environment:

```bash
./start-dev.sh
```

This launches:
- **Development Server** on port 3000
- **Webhook Receiver** on port 3001  
- **Web Dashboard** at `http://localhost:3000/dashboard`
- **Real-time monitoring** via WebSocket

### 4. Testing & Validation

```bash
# Run comprehensive test suite
node test-utils.js test

# Test specific agent
node test-utils.js test agent_123

# Run conversation flow tests
node test-utils.js conversation-test agent_123

# Performance stress testing
node test-utils.js stress-test agent_123 5 60

# Validate environment
node test-utils.js validate-env
```

### 5. Migration Between Environments

```bash
# Export current workspace
node migration-utils.js export workspace-backup.json

# Import to different environment
RETELL_API_KEY=staging_key node migration-utils.js import workspace-backup.json

# Interactive migration
node migration-utils.js migrate
```

## 🎯 Advanced Features

### Agent Templates and Duplication

Save your best agent configurations as templates:

```bash
# Save agent as template
retell save-template agent_123 "customer-service-v1"

# Create new agents from template
retell create-from-template "customer-service-v1" "Customer Service - UK"
retell create-from-template "customer-service-v1" "Customer Service - AU"

# List all templates
retell list-templates
```

### Real-time Change Tracking

The development server tracks all agent changes:

```bash
# Track specific agent
curl -X POST http://localhost:3000/track-changes/agent_123

# View all tracked changes
curl http://localhost:3000/dev-logs?type=diffs

# Compare two agents
curl http://localhost:3000/compare-agents/agent_123/agent_456
```

### Batch Operations

Update multiple agents simultaneously:

```bash
# Using the CLI
echo '{"voice_speed": 1.1, "responsiveness": 0.8}' > updates.json
retell batch-update agent_1 agent_2 agent_3 < updates.json

# Using the development server API
curl -X POST http://localhost:3000/batch-update \
  -H "Content-Type: application/json" \
  -d '{
    "agents": ["agent_1", "agent_2"],
    "updates": {"voice_speed": 1.1}
  }'
```

### Performance Monitoring

```bash
# Start real-time monitoring (60-second intervals)
node migration-utils.js monitor 60

# Run API benchmarks
node migration-utils.js benchmark 20

# Analyze agent performance
node test-utils.js conversation-test agent_123
```

## 🔧 Configuration Examples

### Environment Variables (`.env`)
```bash
# Required
RETELL_API_KEY=your_retell_api_key

# Optional Development Settings
PORT=3000
WEBHOOK_PORT=3001
NODE_ENV=development
DEBUG=retell:*

# Webhook Configuration
DEFAULT_WEBHOOK_URL=https://your-webhook.com
RETELL_WEBHOOK_SECRET=your_webhook_secret
LOCAL_WEBHOOK_URL=http://localhost:3001/webhook

# External Services (for MCP)
ZAPIER_API_KEY=your_zapier_key
SALESFORCE_TOKEN=your_sf_token
CALENDLY_TOKEN=your_calendly_token

# Performance Monitoring
ENABLE_MONITORING=true
MONITOR_INTERVAL=60000

# Backup Configuration
AUTO_BACKUP=true
BACKUP_INTERVAL=3600000
```

### Agent Template Example
```json
{
  "agent_name": "Customer Service Agent",
  "voice_id": "11labs-Adrian",
  "language": "en-US",
  "voice_speed": 1.0,
  "voice_temperature": 0.8,
  "interruption_sensitivity": 0.6,
  "responsiveness": 0.8,
  "enable_backchannel": true,
  "ambient_sound": "office",
  "boosted_keywords": ["support", "help", "issue"],
  "webhook_url": "https://your-webhook.com/customer-service",
  "post_call_analysis_data": [
    {
      "type": "string",
      "name": "issue_category", 
      "description": "Category of customer issue"
    },
    {
      "type": "string",
      "name": "resolution_status",
      "description": "Whether issue was resolved"
    }
  ]
}
```

## 🔌 MCP Integration Examples

### Zapier Integration
```javascript
{
  "type": "mcp",
  "name": "trigger_workflow",
  "description": "Trigger Zapier automation workflows",
  "server_url": "https://api.zapier.com/mcp",
  "tool_name": "trigger_zap",
  "headers": {
    "Authorization": "Bearer your_zapier_token"
  },
  "response_variables": {
    "workflow_id": "{{response.id}}",
    "status": "{{response.status}}"
  }
}
```

### Salesforce Integration
```javascript
{
  "type": "mcp", 
  "name": "lookup_customer",
  "description": "Look up customer in Salesforce CRM",
  "server_url": "https://your-instance.salesforce.com/services/mcp",
  "tool_name": "get_contact",
  "headers": {
    "Authorization": "Bearer your_sf_token",
    "Sforce-Call-Options": "client=retell_ai"
  },
  "query_params": {
    "fields": "Name,Email,Phone,Account.Name"
  }
}
```

## 🐳 Docker Development

### Using Docker Compose

```bash
# Start entire development stack
docker-compose up -d

# Development with hot reloading
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# View logs
docker-compose logs -f retell-dev

# Stop everything
docker-compose down
```

### Services Included
- **retell-dev**: Main development server
- **webhook-receiver**: Webhook testing server  
- **redis**: Caching and session storage
- **ngrok**: Webhook tunneling for external testing

## 📊 Monitoring & Analytics

### Dashboard Features
- Real-time agent monitoring
- API request logging and visualization
- Webhook event tracking
- Performance metrics
- Agent configuration comparison
- Change tracking and diffs

### Performance Metrics Tracked
- API response latency (P50, P95, P99)
- Success rates and error tracking
- Agent utilization statistics  
- Call duration and patterns
- Cost analysis and optimization

### Setting Up Alerts

The toolkit includes configurable alerts for:
- High API latency (>3 seconds)
- Low success rates (<95%)
- Webhook connectivity issues
- Agent configuration problems

## 🔒 Security Best Practices

### API Key Management
```bash
# Store API keys securely
echo "RETELL_API_KEY=your_key" >> .env.local

# Use different keys for different environments  
export DEV_RETELL_API_KEY=dev_key
export STAGING_RETELL_API_KEY=staging_key
export PROD_RETELL_API_KEY=prod_key
```

### Webhook Security
- Always use HTTPS webhooks in production
- Implement signature verification
- Use environment-specific webhook secrets
- Monitor webhook failure rates

### MCP Security
- Use scoped authentication tokens
- Implement request timeouts
- Validate external API responses
- Log all external tool calls

## 📈 Performance Optimization

### Agent Performance Tips
1. **Voice Settings**: Keep voice_speed between 0.9-1.1 for optimal comprehension
2. **Interruption Sensitivity**: Use 0.4-0.7 for natural conversations  
3. **Prompt Length**: Keep LLM prompts under 5000 characters
4. **Response Time**: Configure appropriate timeouts for MCP tools

### Development Server Optimization
```javascript
// config/production.js
{
  "proxy": {
    "timeout": 30000,
    "keepAlive": true,
    "maxSockets": 50
  },
  "logging": {
    "level": "info",
    "max_log_files": 100
  },
  "monitoring": {
    "metrics_retention_hours": 24,
    "alert_thresholds": {
      "latency_ms": 2000,
      "error_rate_percent": 5
    }
  }
}
```

## 🧪 Testing Strategies

### Unit Testing Agents
```bash
# Test individual agent configuration
node test-utils.js test agent_123

# Validate all agents
node test-utils.js test

# Test specific functionality
retell test-webhook http://localhost:3001/webhook
```

### Integration Testing
```bash
# Test MCP integrations
curl -X POST http://localhost:3000/simulate-webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "call_started", "agentId": "agent_123"}'

# Test conversation flows
node test-utils.js conversation-test agent_123
```

### Load Testing
```bash
# Stress test API endpoints
node test-utils.js stress-test agent_123 10 120

# Benchmark API performance
node migration-utils.js benchmark 50
```

## 🚦 Deployment Pipeline

### 1. Development Phase
- Create and test agents locally
- Use development server for rapid iteration
- Test MCP integrations with local tools

### 2. Staging Phase  
- Export agents from development
- Import to staging environment
- Run comprehensive test suite
- Performance validation

### 3. Production Deployment
- Final configuration validation
- Migrate tested agents to production
- Monitor performance and webhooks
- Setup automated health checks

### Example CI/CD Integration
```yaml
# .github/workflows/retell-deploy.yml
name: Deploy Retell Agents

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: node test-utils.js test
        env:
          RETELL_API_KEY: ${{ secrets.RETELL_API_KEY_STAGING }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          node migration-utils.js migrate
        env:
          SOURCE_API_KEY: ${{ secrets.RETELL_API_KEY_STAGING }}
          TARGET_API_KEY: ${{ secrets.RETELL_API_KEY_PROD }}
```

## 🎛️ Advanced Configuration

### Custom LLM Integration
If you're using custom LLMs instead of Retell LLMs:

```javascript
// Custom LLM configuration
{
  "response_engine": {
    "type": "custom_llm", 
    "url": "https://your-llm-endpoint.com",
    "headers": {
      "Authorization": "Bearer your_llm_token"
    }
  }
}
```

### Advanced MCP Setup
```javascript
// Complex MCP configuration with multiple tools
{
  "tools": [
    {
      "type": "mcp",
      "name": "crm_lookup",
      "server_url": "https://api.salesforce.com/mcp",
      "tool_name": "get_contact", 
      "headers": {
        "Authorization": "Bearer {{sf_token}}",
        "Sforce-Call-Options": "client=retell_ai"
      },
      "response_variables": {
        "customer_name": "{{response.name}}",
        "customer_tier": "{{response.tier}}"
      }
    },
    {
      "type": "mcp",
      "name": "schedule_meeting",
      "server_url": "https://api.calendly.com/mcp",
      "tool_name": "create_event",
      "headers": {
        "Authorization": "Bearer {{calendly_token}}"
      }
    }
  ]
}
```

## 💡 Best Practices

### Development Workflow
1. **Always test locally first** using the development server
2. **Use agent templates** for consistent configurations
3. **Track changes** before making modifications
4. **Validate configurations** before deployment
5. **Monitor performance** continuously

### Agent Configuration
1. **Use descriptive names** for agents and LLMs
2. **Configure webhooks** for all production agents
3. **Set appropriate timeouts** for external tools
4. **Test voice settings** with real conversations
5. **Document MCP integrations** thoroughly

### MCP Integration
1. **Use HTTPS endpoints** for all MCP servers
2. **Implement proper authentication** with scoped tokens
3. **Set reasonable timeouts** (5-10 seconds)
4. **Handle errors gracefully** in MCP tools
5. **Test external connectivity** regularly

## 🚨 Troubleshooting

### Common Issues

#### API Connection Problems
```bash
# Test API connectivity
curl -H "Authorization: Bearer $RETELL_API_KEY" \
     https://api.retellai.com/v2/list-agents

# Check API key validity
./index.js list-agents

# Verify environment configuration
node test-utils.js validate-env
```

#### Webhook Issues
```bash
# Test webhook locally
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "call": {"call_id": "test"}}'

# Test remote webhook
retell test-webhook https://your-webhook.com/endpoint

# Check webhook logs
curl http://localhost:3001/events
```

#### MCP Connection Problems  
```bash
# Test MCP server directly
curl https://your-mcp-server.com/health

# Validate MCP configuration
retell edit-mcp agent_123

# Check MCP tool logs in dashboard
open http://localhost:3000/dashboard
```

#### Performance Issues
```bash
# Monitor API performance
node migration-utils.js monitor 30

# Run benchmark tests
node migration-utils.js benchmark

# Check system health
node scripts/health-check.js
```

### Debug Mode

Enable comprehensive debugging:

```bash
# Enable debug logging
export DEBUG=retell:*

# Run with verbose output
node test-utils.js test --verbose

# Check development server logs
curl http://localhost:3000/dev-logs
```

## 📚 API Reference Summary

### Key Endpoints Used

| Endpoint | Method | Purpose |
|----------|---------|---------|
| `/list-agents` | GET | List all agents |
| `/get-agent/{id}` | GET | Get agent details |
| `/create-agent` | POST | Create new agent |
| `/update-agent/{id}` | PATCH | Update agent config |
| `/delete-agent/{id}` | DELETE | Delete agent |
| `/list-retell-llms` | GET | List LLM engines |
| `/create-retell-llm` | POST | Create LLM engine |
| `/update-retell-llm/{id}` | PATCH | Update LLM config |

### Response Formats

**Agent Object:**
```json
{
  "agent_id": "string",
  "agent_name": "string",
  "version": 0,
  "is_published": false,
  "response_engine": {
    "type": "retell-llm",
    "llm_id": "string"
  },
  "voice_id": "string",
  "voice_speed": 1.0,
  "interruption_sensitivity": 0.6,
  "webhook_url": "string"
}
```

**LLM Object:**
```json
{
  "llm_id": "string",
  "general_prompt": "string",
  "begin_message": "string",
  "model_name": "gpt-4o-mini",
  "tools": [...]
}
```

## 🤝 Contributing

### Adding New Features
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Add your changes to the appropriate files
4. Update documentation and tests
5. Submit pull request

### Reporting Issues
- Use GitHub issues for bugs and feature requests
- Include CLI version: `./index.js --version`
- Include error logs and configuration details
- Provide steps to reproduce

## 📞 Support

- **Retell AI Documentation**: https://docs.retellai.com
- **API Reference**: https://docs.retellai.com/api-references
- **Community Discord**: https://discord.com/invite/wxtjkjj2zp
- **Status Page**: https://status.retellai.com

## 🔄 Updates and Maintenance

### Keeping the Toolkit Updated
```bash
# Update dependencies
npm update

# Pull latest changes
git pull origin main

# Re-run setup if needed
./setup.sh

# Test after updates
node test-utils.js validate-env
./quick-test.sh
```

### Backup Strategy
```bash
# Daily backups (add to crontab)
0 2 * * * cd /path/to/retell-toolkit && node backup-agents.js

# Manual backup before changes
node migration-utils.js export backup-$(date +%Y%m%d).json
```

---

## 🎉 You're All Set!

Your Retell AI development environment is now ready for rapid iteration and testing. The toolkit provides everything needed to:

- ✅ **Manage agents efficiently** with CLI tools
- ✅ **Edit MCP connections** for external integrations  
- ✅ **Duplicate and test** agent variations quickly
- ✅ **Monitor performance** in real-time
- ✅ **Deploy confidently** with comprehensive testing
- ✅ **Migrate between environments** seamlessly

**Start developing:**
```bash
./start-dev.sh
open http://localhost:3000/dashboard
retell list-agents
```

Happy building! 🚀