#!/bin/bash

# Retell AI CLI Setup Script
# This script sets up the development environment for Retell AI CLI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 16+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ "$NODE_MAJOR" -lt 16 ]; then
        print_error "Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 16+"
        exit 1
    fi
    
    print_success "Node.js $NODE_VERSION found"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm"
        exit 1
    fi
    
    print_success "npm $(npm --version) found"
}

# Setup project directory
setup_project() {
    print_status "Setting up project structure..."
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p templates
    mkdir -p config
    mkdir -p public
    
    # Copy dashboard to public directory
    if [ -f "dashboard.html" ]; then
        cp dashboard.html public/dashboard.html
        print_success "Dashboard copied to public directory"
    fi
    
    # Create .gitignore if it doesn't exist
    if [ ! -f ".gitignore" ]; then
        cat > .gitignore << EOF
# Dependencies
node_modules/
npm-debug.log*

# Configuration files with secrets
.retellrc.json
.env
.env.local

# Logs
logs/
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Dependency directories
node_modules/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test
.env.production

# Templates with sensitive data
retell-templates.json
ab-test-config.json

# Development artifacts
*.tmp
*.temp
EOF
        print_success "Created .gitignore"
    fi
    
    print_success "Project structure created"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ -f "package.json" ]; then
        npm install
        print_success "Dependencies installed"
    else
        print_error "package.json not found. Please ensure all files are in place"
        exit 1
    fi
}

# Setup environment
setup_environment() {
    print_status "Setting up environment configuration..."
    
    # Create example .env file
    if [ ! -f ".env.example" ]; then
        cat > .env.example << EOF
# Retell AI Configuration
RETELL_API_KEY=your_retell_api_key_here

# Development Server Configuration  
PORT=3000
NODE_ENV=development

# Optional: Custom Retell API Base URL
# RETELL_BASE_URL=https://api.retellai.com/v2

# Webhook Configuration
DEFAULT_WEBHOOK_URL=https://your-webhook.com/webhook

# Debug Settings
DEBUG=retell:*

# Local Development URLs
LOCAL_WEBHOOK_URL=http://localhost:3001/webhook
NGROK_URL=https://your-ngrok-url.ngrok.io
EOF
        print_success "Created .env.example"
    fi
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        print_warning "No .env file found. Creating from example..."
        cp .env.example .env
        print_warning "Please edit .env file and add your Retell AI API key"
    fi
}

# Make scripts executable
make_executable() {
    print_status "Making scripts executable..."
    
    chmod +x index.js
    chmod +x dev-server.js
    
    if [ -f "example.js" ]; then
        chmod +x example.js
    fi
    
    print_success "Scripts are now executable"
}

# Test installation
test_installation() {
    print_status "Testing installation..."
    
    # Test CLI without API key
    if ./index.js --version &> /dev/null; then
        print_success "CLI tool is working"
    else
        print_error "CLI tool test failed"
        exit 1
    fi
    
    # Test if all required files exist
    required_files=("index.js" "dev-server.js" "package.json")
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Required file missing: $file"
            exit 1
        fi
    done
    
    print_success "All required files present"
}

# Setup global installation option
setup_global() {
    if [ "$1" = "--global" ] || [ "$1" = "-g" ]; then
        print_status "Installing globally..."
        npm install -g .
        print_success "CLI installed globally. You can now use 'retell' command anywhere"
        print_status "Test with: retell --version"
    else
        print_status "To install globally later, run: npm install -g ."
    fi
}

# Create development scripts
create_dev_scripts() {
    print_status "Creating development scripts..."
    
    # Create start-dev script
    cat > start-dev.sh << 'EOF'
#!/bin/bash

# Start Retell AI Development Environment
echo "🚀 Starting Retell AI Development Environment..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Check if API key is set
if [ -z "$RETELL_API_KEY" ]; then
    echo "❌ RETELL_API_KEY not set. Please configure it in .env file"
    exit 1
fi

# Start development server in background
echo "📡 Starting development server..."
node dev-server.js &
DEV_SERVER_PID=$!

# Wait for server to start
sleep 2

# Open dashboard in browser (macOS)
if command -v open &> /dev/null; then
    echo "🌐 Opening dashboard..."
    open http://localhost:${PORT:-3000}/dashboard
fi

# Keep script running
echo "✅ Development environment ready!"
echo "📊 Dashboard: http://localhost:${PORT:-3000}/dashboard"  
echo "🔗 API Proxy: http://localhost:${PORT:-3000}/api/retell/*"
echo ""
echo "Press Ctrl+C to stop the development server"

# Handle cleanup
trap "echo 'Stopping development server...'; kill $DEV_SERVER_PID; exit" SIGINT SIGTERM

wait $DEV_SERVER_PID
EOF

    chmod +x start-dev.sh
    
    # Create quick test script
    cat > quick-test.sh << 'EOF'
#!/bin/bash

# Quick Test Script for Retell AI CLI
echo "🧪 Running quick tests..."

# Load environment
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

echo "Testing CLI configuration..."
./index.js --version

if [ -n "$RETELL_API_KEY" ]; then
    echo "Testing API connectivity..."
    ./index.js list-agents
else
    echo "⚠️  No API key configured. Run './index.js config' to set up"
fi

echo "✅ Quick test completed!"
EOF

    chmod +x quick-test.sh
    
    print_success "Development scripts created"
}

# Create backup and migration utilities
create_utilities() {
    print_status "Creating utility scripts..."
    
    cat > backup-agents.js << 'EOF'
#!/usr/bin/env node

/**
 * Backup all Retell AI agents to local files
 */

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

async function backupAgents() {
    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) {
        console.error('❌ RETELL_API_KEY environment variable required');
        process.exit(1);
    }

    const config = {
        baseURL: 'https://api.retellai.com/v2',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        console.log('📦 Backing up agents...');
        
        // Get all agents
        const agentsResponse = await axios.get('/list-agents', config);
        const agents = agentsResponse.data;
        
        // Get all LLMs
        const llmsResponse = await axios.get('/list-retell-llms', config);
        const llms = llmsResponse.data;

        // Create backup directory
        const backupDir = `backup-${new Date().toISOString().split('T')[0]}`;
        await fs.mkdir(backupDir, { recursive: true });

        // Save agents
        await fs.writeFile(
            path.join(backupDir, 'agents.json'),
            JSON.stringify(agents, null, 2)
        );

        // Save LLMs
        await fs.writeFile(
            path.join(backupDir, 'llms.json'),
            JSON.stringify(llms, null, 2)
        );

        // Save individual agent files
        const agentDir = path.join(backupDir, 'agents');
        await fs.mkdir(agentDir, { recursive: true });
        
        for (const agent of agents) {
            await fs.writeFile(
                path.join(agentDir, `${agent.agent_id}.json`),
                JSON.stringify(agent, null, 2)
            );
        }

        console.log(`✅ Backup completed: ${backupDir}`);
        console.log(`📊 Backed up ${agents.length} agents and ${llms.length} LLMs`);
        
    } catch (error) {
        console.error('❌ Backup failed:', error.message);
        process.exit(1);
    }
}

backupAgents();
EOF

    chmod +x backup-agents.js
    
    print_success "Utility scripts created"
}

# Print completion message
print_completion() {
    print_success "🎉 Retell AI CLI setup completed!"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Edit .env file and add your Retell AI API key"
    echo "2. Configure the CLI: ./index.js config"
    echo "3. Test the setup: ./quick-test.sh"
    echo "4. Start development: ./start-dev.sh"
    echo ""
    echo -e "${BLUE}Quick commands:${NC}"
    echo "  ./index.js list-agents              # List all agents"
    echo "  ./index.js duplicate-agent <id> <name>  # Duplicate an agent"
    echo "  ./index.js edit-prompt <id>         # Edit agent prompt"
    echo "  ./index.js proxy --port 3000       # Start dev server"
    echo ""
    echo -e "${BLUE}Development dashboard:${NC}"
    echo "  ./start-dev.sh"
    echo "  Open: http://localhost:3000/dashboard"
    echo ""
    echo -e "${YELLOW}Don't forget to:${NC}"
    echo "  - Add your RETELL_API_KEY to .env file"
    echo "  - Configure webhook URLs for your agents"
    echo "  - Test MCP connections if using external tools"
    echo ""
}

# Main setup flow
main() {
    echo -e "${GREEN}"
    cat << 'EOF'
    ____       __       __ __   ___    ____   ______ __     ____
   / __ \___  / /____  / // /  /   |  /  _/  / ____// /    /  _/
  / /_/ / _ \/ __/ _ \/ // /  / /| |  / /   / /    / /     / /  
 / _, _/  __/ /_/  __/ // /  / ___ |_/ /   / /___ / /___ _/ /   
/_/ |_|\___/\__/\___/_//_/  /_/  |_/___/   \____//_____//___/   
                                                               
        Development CLI & Proxy Setup
EOF
    echo -e "${NC}"
    
    print_status "Starting Retell AI CLI setup..."
    
    # Run setup steps
    check_prerequisites
    setup_project
    install_dependencies
    setup_environment
    make_executable
    create_dev_scripts
    create_utilities
    test_installation
    setup_global "$@"
    
    print_completion
}

# Run main function
main "$@"