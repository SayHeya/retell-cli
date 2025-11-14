# Complete Project Fixture

This fixture represents a complete CLI project structure as described in SPECIFICATION.md. It's used for integration and E2E tests.

## Structure

```
complete-project/
├── workspaces.json              # Workspace API keys and configuration
├── prompts/                     # Reusable prompt sections
│   ├── base/
│   │   ├── greeting.txt         # Uses {{company_name}}
│   │   ├── tone-professional.txt
│   │   ├── tone-casual.txt
│   │   └── closing.txt
│   ├── customer-service/
│   │   ├── order-lookup.txt     # Uses {{current_time_Australia/Sydney}}
│   │   └── refund-policy.txt    # Uses {{support_hours}}
│   └── sales/
│       └── qualification.txt    # Uses {{lead_name}}
├── templates/                   # Agent templates for quick creation
│   ├── customer-service.json
│   └── sales-agent.json
└── agents/                      # Agent instances
    ├── customer-service/
    │   ├── agent.json           # Agent configuration
    │   ├── staging.json         # Staging workspace metadata
    │   ├── production.json      # Production workspace metadata
    │   └── knowledge/           # Knowledge base files
    │       ├── .kb-meta.json    # KB sync metadata
    │       └── faq.txt          # KB content
    └── sales-agent/
        ├── agent.json
        ├── staging.json
        └── production.json
```

## Agent Examples

### Customer Service Agent
- **Agent**: `agents/customer-service/agent.json`
- **Features**:
  - 5 composable prompt sections
  - 2 static variables: `company_name`, `support_hours`
  - 2 override variables: `user_id`, `session_token` (both "OVERRIDE")
  - 3 dynamic variables: `customer_name`, `phone`, `order_id`
  - Knowledge base with FAQ
  - Post-call analysis enabled
- **Workspace Status**:
  - Staging: synced 2025-11-14T10:30:00.000Z
  - Production: synced 2025-11-13T15:00:00.000Z (older)

### Sales Agent
- **Agent**: `agents/sales-agent/agent.json`
- **Features**:
  - 4 composable prompt sections with casual tone
  - 1 static variable: `company_name`
  - 2 dynamic variables: `lead_name`, `phone`
  - No knowledge base
  - No tools configured
- **Workspace Status**:
  - Staging: synced 2025-11-14T09:15:00.000Z
  - Production: synced 2025-11-13T14:20:00.000Z (older)

## Variable Types Demonstrated

### Static Variables
Variables replaced at build time:
- `{{company_name}}` → "Acme Corp"
- `{{support_hours}}` → "9am-5pm EST"

### Override Variables
Variables set to "OVERRIDE" and provided at call initialization:
- `{{user_id}}` → Provided at runtime
- `{{session_token}}` → Provided at runtime

### Dynamic Variables
Variables extracted during the call:
- `{{customer_name}}` → type: string
- `{{phone}}` → type: string
- `{{order_id}}` → type: string
- `{{lead_name}}` → type: string

### System Variables
Variables provided by Retell runtime:
- `{{current_time_Australia/Sydney}}` → Current time in specified timezone

## Knowledge Base Example

The customer-service agent demonstrates:
- KB files in `agents/customer-service/knowledge/`
- KB metadata tracking in `.kb-meta.json`
- Per-workspace file sync status (file_id, hash, size, last_sync)
- Different KB IDs for staging vs production

## Sync State

This fixture demonstrates various sync states:
- **Customer Service**: Staging is newer than production
- **Sales Agent**: Staging is newer than production
- **KB Files**: Can be tracked independently per workspace

## Usage in Tests

This fixture can be used to test:
- Loading agent configurations
- Validating prompt composition
- Variable categorization (static, override, dynamic, system)
- Metadata management
- Knowledge base sync tracking
- Hash calculation for change detection
- Push/pull/release operations
- Workspace isolation
