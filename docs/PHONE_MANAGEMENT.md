# Phone Number Management

Complete guide for managing phone numbers, SIP trunks, and the Phone Number Directory in Retell AI.

## Overview

The Retell CLI provides comprehensive phone number management:
- Import phone numbers via SIP trunk
- Assign numbers to agents
- Track numbers across workspaces
- Centralized phone number directory

## Quick Start

```bash
# Import a phone number
retell phone import "+14155551234" "mytrunk.pstn.twilio.com" \
  --workspace staging \
  --username "retell_user" \
  --password "password" \
  --inbound-agent agent_abc123

# List all phone numbers
retell phone list -w staging

# Update phone number assignment
retell phone update "+14155551234" -w staging --inbound-agent agent_new123

# Delete a phone number
retell phone delete "+14155551234" -w staging
```

## Phone Number Operations

### Import Phone Number

Import your own phone numbers via SIP trunking:

```bash
retell phone import <phone-number> <termination-uri> [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-w, --workspace` | Target workspace (staging/production) |
| `--username` | SIP trunk authentication username |
| `--password` | SIP trunk authentication password |
| `--inbound-agent` | Agent ID for inbound calls |
| `--outbound-agent` | Agent ID for outbound calls |
| `--nickname` | Friendly name for the number |

**Example:**
```bash
retell phone import "+14155551234" "mytrunk.pstn.twilio.com" \
  -w staging \
  --username "retell_user" \
  --password "secure_password" \
  --inbound-agent agent_abc123 \
  --outbound-agent agent_abc123 \
  --nickname "Customer Service Line"
```

### List Phone Numbers

```bash
retell phone list -w staging
retell phone list -w production --json
```

### Update Phone Number

```bash
retell phone update "+14155551234" -w staging \
  --inbound-agent agent_new123 \
  --nickname "New Name"
```

### Delete Phone Number

```bash
retell phone delete "+14155551234" -w staging
retell phone delete "+14155551234" -w staging -y  # Skip confirmation
```

## Phone Number Directory

The Phone Number Directory provides a centralized view of all phone numbers and their assignments.

### Directory Structure

```
phone-numbers/
├── directory.json              # Master list (all numbers, all workspaces)
├── staging/
│   ├── numbers.json            # Staging phone numbers
│   └── assignments.json        # Staging agent assignments
├── production/
│   ├── numbers.json            # Production phone numbers
│   └── assignments.json        # Production agent assignments
└── twilio/
    ├── trunks.json             # SIP trunk configs (gitignored)
    └── sync.json               # Sync metadata (gitignored)
```

### Directory Commands

**Initialize Directory:**
```bash
retell phone-dir init
```

**List All Numbers:**
```bash
retell phone-dir list
retell phone-dir list --workspace staging
```

**Find Numbers for an Agent:**
```bash
retell phone-dir agent-numbers agents/customer-service
```

**Show Number Details:**
```bash
retell phone-dir show "+14155551234"
```

**Find Unassigned Numbers:**
```bash
retell phone-dir unassigned
retell phone-dir unassigned --workspace staging
```

**Sync with External Sources:**
```bash
retell phone-dir sync --all
retell phone-dir sync-twilio --all
retell phone-dir sync-retell --all
```

**Validate Directory:**
```bash
retell phone-dir validate
```

**Generate Report:**
```bash
retell phone-dir report
retell phone-dir report --format csv --output report.csv
```

### Directory Entry Format

```json
{
  "+14155551234": {
    "phone_number": "+14155551234",
    "phone_number_pretty": "(415) 555-1234",
    "phone_number_type": "local",
    "provider": "twilio",
    "workspaces": {
      "staging": {
        "imported": true,
        "agent_path": "agents/customer-service",
        "agent_id": "agent_staging_abc123",
        "assignment_type": "inbound-outbound"
      }
    }
  }
}
```

## SIP Trunk Integration

### Elastic SIP Trunking (Recommended)

Best for providers supporting elastic SIP trunking. Provides full feature support including call transfer.

**Setup:**

1. **Configure Your SIP Trunk Provider**
   - Set origination URI to: `sip:5t4n6j0wnrl.sip.livekit.cloud`
   - For TCP: `sip:5t4n6j0wnrl.sip.livekit.cloud;transport=tcp`
   - Configure authentication (username/password recommended)

2. **Import Number to Retell**
   ```bash
   retell phone import "+14155551234" "your-trunk.pstn.twilio.com" \
     -w staging \
     --username "your_username" \
     --password "your_password" \
     --inbound-agent agent_id_here
   ```

3. **Configure Provider for Inbound**
   - Point your number to: `sip:+14155551234@5t4n6j0wnrl.sip.livekit.cloud`

### Supported Features
- Inbound and outbound calls
- Call transfer (including SIP REFER)
- All Retell telephony features

### Phone Number Types

| Type | Description |
|------|-------------|
| `retell-twilio` | Numbers purchased through Retell (Twilio backend) |
| `retell-telnyx` | Numbers purchased through Retell (Telnyx backend) |
| `custom` | Numbers imported via SIP trunk |

## Twilio CLI Integration

For advanced Twilio management, use the Twilio CLI:

### Installation

```bash
npm install -g twilio-cli
```

### Authentication

```bash
# Environment variables (recommended)
export TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
export TWILIO_AUTH_TOKEN=your_auth_token_here

# Or interactive login
twilio login
```

### Common Commands

**Search for Numbers:**
```bash
twilio api:core:available-phone-numbers:local:list \
  --area-code 415 --country-code US
```

**Purchase Number:**
```bash
twilio api:core:incoming-phone-numbers:create \
  --phone-number "+14155551234" \
  --friendly-name "Customer Service Line"
```

**List Numbers:**
```bash
twilio api:core:incoming-phone-numbers:list -o json
```

**Add to SIP Trunk:**
```bash
twilio api:trunking:v1:trunks:phone-numbers:create \
  --trunk-sid TKxxxxxxxx \
  --phone-number-sid PNxxxxxxxx
```

## Common Workflows

### Workflow 1: Import New Number

```bash
# 1. Import to staging
retell phone import "+14155551234" "mytrunk.pstn.twilio.com" \
  -w staging \
  --username "user" \
  --password "pass" \
  --inbound-agent agent_staging_abc123

# 2. Test in staging

# 3. Import to production
retell phone import "+14155551234" "mytrunk.pstn.twilio.com" \
  -w production \
  --username "user" \
  --password "pass" \
  --inbound-agent agent_prod_xyz789
```

### Workflow 2: Migrate Numbers to New Agent

```bash
# 1. See what numbers the old agent has
retell phone-dir agent-numbers agents/old-agent

# 2. Get new agent ID
NEW_AGENT_ID=$(cat agents/new-agent/staging.json | jq -r '.agent_id')

# 3. Reassign numbers
retell phone update "+14155551234" -w staging --inbound-agent "$NEW_AGENT_ID"

# 4. Verify
retell phone-dir agent-numbers agents/new-agent
```

### Workflow 3: Audit Phone Numbers

```bash
# Generate full report
retell phone-dir report > phone-inventory.txt

# Find unassigned numbers
retell phone-dir unassigned --all

# Validate integrity
retell phone-dir validate
```

## Best Practices

### Authentication
- Use username/password auth rather than IP whitelisting (Retell has no static IPs)
- Store credentials in environment variables, never in code

### Agent Binding
- Set both `inbound_agent_id` and `outbound_agent_id` for bidirectional functionality
- Use `null` to disable inbound or outbound on a number

### Version Control
**Commit these files:**
- `phone-numbers/directory.json`
- `phone-numbers/staging/*.json`
- `phone-numbers/production/*.json`

**Never commit:**
- `phone-numbers/twilio/trunks.json` (has credential refs)
- `phone-numbers/twilio/sync.json` (runtime data)

### Number Format
All phone numbers must be in E.164 format:
- Include country code: `+1` for US/Canada
- No formatting characters: `+14155551234` not `(415) 555-1234`

## Troubleshooting

### Inbound Calls Not Connecting
- Check origination settings in SIP trunk provider
- Verify Retell's SIP URI is correctly configured
- Try TCP transport: `;transport=tcp`

### Outbound Calls Not Connecting
- Verify termination URI is correct
- Check SIP trunk authentication credentials
- Ensure provider allows outbound to PSTN

### Directory Out of Sync
```bash
retell phone-dir sync-retell --all
retell phone-dir validate
```

## Additional Resources

- [Retell AI Docs](https://docs.retellai.com)
- [Twilio CLI Docs](https://www.twilio.com/docs/twilio-cli)
- [Retell TypeScript SDK](https://github.com/RetellAI/retell-typescript-sdk)
