# Retell AI Development CLI & Proxy

A comprehensive CLI tool and development server for managing Retell AI agents with faster iteration cycles during development.

## Features

### CLI Tool Features
- **Agent Management**: List, create, duplicate, edit, and delete agents
- **LLM Management**: Manage Retell LLM response engines
- **MCP Integration**: Edit Model Context Protocol settings for external tool connections
- **Template System**: Save agents as templates and create new agents from templates
- **Interactive Editing**: Edit agent prompts and settings with interactive prompts
- **Batch Operations**: Update multiple agents simultaneously

### Development Server Features
- **API Proxy**: Local proxy server for Retell AI API with request logging
- **Real-time Monitoring**: WebSocket connection for live updates
- **Agent Comparison**: Compare configurations between agents
- **Change Tracking**: Track and diff agent modifications over time
- **Webhook Testing**: Simulate and test webhook endpoints
- **Web Dashboard**: Visual interface for agent management
- **Performance Monitoring**: API latency tracking and visualization

## Installation

### Prerequisites
- Node.js 16+ 
- Retell AI account and API key

### Setup

1. **Clone or create the project:**
```bash
mkdir retell-cli && cd retell-cli
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure your API key:**
```bash
# Option 1: Use the CLI configuration
./index.js config

# Option 2: Set environment variable
export RETELL_API_KEY="your_api_key_here"
```

4. **Install globally (optional):**
```bash
npm install -g .
```

## CLI Usage

### Configuration
```bash
# Configure API credentials
retell config

# The CLI will store configuration in .retellrc.json
```

### Agent Management

```bash
# List all agents
retell list-agents

# Get specific agent details
retell get-agent <agent-id>
retell get-agent <agent-id> --version 2

# Duplicate an agent
retell duplicate-agent <source-agent-id> "New Agent Name"

# Edit agent prompt interactively
retell edit-prompt <agent-id>

# Edit MCP settings
retell edit-mcp <agent-id>

# Delete an agent
retell delete-agent <agent-id>
```

### LLM Management

```bash
# List all LLM response engines
retell list-llms

# Get specific LLM details
retell get-llm <llm-id>
retell get-llm <llm-id> --version 1
```

### Template System

```bash
# Save agent as template
retell save-template <agent-id> "template-name"

# Create agent from template
retell create-from-template "template-name" "New Agent Name"

# List saved templates
retell list-templates
```

### Development Tools

```bash
# Start development proxy server
retell proxy --port 3000

# Test webhook endpoint
retell test-webhook "http://localhost:3001/webhook"
```

## Development Server

The development server provides additional features for development workflow:

### Starting the Server

```bash
# Method 1: Using the CLI
retell proxy --port 3000

# Method 2: Direct execution
RETELL_API_KEY="your_key" node dev-server.js

# Method 3: Using environment file
echo "RETELL_API_KEY=your_key" > .env
node dev-server.js
```

### Server Endpoints

#### API Proxy
```bash
# All Retell AI endpoints are available under /api/retell/
GET /api/retell/list-agents
POST /api/retell/create-agent
PATCH /api/retell/update-agent/{agent_id}
```

#### Development Tools
```bash
# Health check
GET /health

# Agent comparison
GET /compare-agents/{agent1_id}/{agent2_id}

# Track agent changes
POST /track-changes/{agent_id}

# Quick agent updates
PATCH /quick-update/{agent_id}

# Batch operations
POST /batch-update

# Simulate webhook events
POST /simulate-webhook

# Get development logs
GET /dev-logs?type=[calls|webhooks|diffs]
```

### Web Dashboard

Visit `http://localhost:3000/dashboard` to access the visual interface featuring:

- **Real-time agent monitoring**
- **Interactive agent editing**
- **API request logging**
- **Webhook event tracking**
- **Performance metrics**
- **Agent comparison tools**

## Configuration Files

### `.retellrc.json`
Stores CLI configuration:
```json
{
  "apiKey": "your_retell_api_key",
  "defaultWebhookUrl": "https://your-webhook-url.com"
}
```

### `retell-templates.json`
Stores saved agent templates:
```json
{
  "template-name": {
    "name": "template-name",
    "agent_data": { ... },
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

## Development Workflow

### Typical Development Flow

1. **Start the development server:**
```bash
retell proxy --port 3000
```

2. **Open the dashboard:**
```bash
open http://localhost:3000/dashboard
```

3. **List and inspect agents:**
```bash
retell list-agents
retell get-agent <agent-id>
```

4. **Make changes and test:**
```bash
# Edit prompts
retell edit-prompt <agent-id>

# Edit MCP connections
retell edit-mcp <agent-id>

# Test with webhook simulation
```

5. **Track changes and compare:**
```bash
# Use the dashboard or API endpoints to track changes
curl http://localhost:3000/track-changes/<agent-id> -X POST
```

### Agent Duplication and Templates

```bash
# Save working agent as template
retell save-template <working-agent-id> "production-template"

# Create variations for testing
retell create-from-template "production-template" "Test Agent 1"
retell create-from-template "production-template" "Test Agent 2"

# Compare different configurations
# Use the dashboard compare feature or:
curl http://localhost:3000/compare-agents/<agent1>/<agent2>
```

## MCP Integration

The CLI provides tools to manage Model Context Protocol connections:

### Supported MCP Operations
- Add new MCP tools to agents
- Edit existing MCP tool configurations
- Remove MCP tools
- Configure server URLs and authentication
- Set custom headers and query parameters

### Example MCP Setup Flow
```bash
# Edit MCP settings for an agent
retell edit-mcp <agent-id>

# The CLI will guide you through:
# 1. Viewing current MCP tools
# 2. Adding new tools
# 3. Configuring server connections
# 4. Setting authentication headers
# 5. Defining response variables
```

## API Reference

### Agent Object Structure
Based on the Retell AI documentation, agents have the following key properties:

```javascript
{
  "agent_id": "string",
  "agent_name": "string", 
  "version": 0,
  "is_published": false,
  "response_engine": {
    "type": "retell-llm",
    "llm_id": "string",
    "version": 0
  },
  "voice_id": "string",
  "voice_temperature": 1,
  "voice_speed": 1,
  "interruption_sensitivity": 1,
  "language": "en-US",
  "webhook_url": "string",
  "boosted_keywords": [],
  "pronunciation_dictionary": [],
  // ... many more configuration options
}
```

### LLM Response Engine Structure
```javascript
{
  "llm_id": "string",
  "general_prompt": "string",
  "begin_message": "string", 
  "model_name": "string",
  "tools": [
    {
      "type": "mcp",
      "name": "tool_name",
      "description": "Tool description",
      "server_url": "https://your-mcp-server.com",
      "tool_name": "specific_tool"
    }
  ]
}
```

## Troubleshooting

### Common Issues

1. **API Key Issues**
   - Ensure your API key is valid
   - Check that it's properly configured: `retell config`
   - Verify environment variable: `echo $RETELL_API_KEY`

2. **Connection Issues**
   - Check your internet connection
   - Verify Retell AI service status
   - Review API rate limits

3. **MCP Configuration Issues**
   - Ensure MCP server URLs are accessible
   - Check authentication headers
   - Verify tool names match server implementation

### Debug Mode

Enable debug logging:
```bash
DEBUG=retell:* retell list-agents
```

### Logs and Monitoring

The development server provides comprehensive logging:
- API request/response logs
- Webhook event tracking
- Agent change history
- Performance metrics

Access logs via:
- Dashboard: `http://localhost:3000/dashboard`
- API: `http://localhost:3000/dev-logs`
- WebSocket: Real-time updates

## Advanced Usage

### Custom Scripts

You can create custom scripts using the CLI as a library:

```javascript
import { RetellCLI } from './index.js';

const cli = new RetellCLI();
await cli.loadConfig();

// Get all agents
const agents = await cli.listAgents();

// Duplicate and modify agents
for (const agent of agents) {
  if (agent.agent_name.includes('production')) {
    await cli.duplicateAgent(agent.agent_id, `${agent.agent_name} - Test`);
  }
}
```

### Environment Variables

```bash
# Required
RETELL_API_KEY=your_retell_api_key

# Optional
PORT=3000                    # Development server port
RETELL_BASE_URL=custom_url   # Custom Retell API base URL
DEBUG=retell:*               # Enable debug logging
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues related to:
- **Retell AI API**: Visit [Retell AI Documentation](https://docs.retellai.com)
- **This CLI Tool**: Create an issue in the repository
- **Feature Requests**: Create an issue with the "enhancement" label

---

**Quick Start Summary:**
```bash
# Install and configure
npm install -g .
retell config

# Start development workflow
retell proxy --port 3000
open http://localhost:3000/dashboard

# Manage agents
retell list-agents
retell duplicate-agent <id> "Test Agent"
retell edit-prompt <id>
```
