# Retell AI Phone Number and SIP Trunk Management

Complete guide for provisioning and managing phone numbers and SIP trunks programmatically using Retell AI's API and TypeScript SDK.

## Overview

Retell AI provides full API support for phone number and SIP trunk management, allowing you to build infrastructure-as-code solutions for your voice AI deployment. All operations are available through the TypeScript SDK.

## Installation

```bash
npm install retell-sdk
```

## SDK Initialization

```typescript
import Retell from 'retell-sdk';

const client = new Retell({
  apiKey: 'YOUR_RETELL_API_KEY',
});
```

---

## Phone Number Operations

### 1. Create Phone Number

Purchase new phone numbers from Retell's providers (Twilio/Telnyx).

```typescript
const phoneNumberResponse = await client.phoneNumber.create();
console.log(phoneNumberResponse.phone_number);
```

**Response includes:**
- `phone_number` - E.164 format (+14157774444)
- `phone_number_type` - Provider type (retell-twilio, retell-telnyx)
- `phone_number_pretty` - Formatted display (+1 (415) 777-4444)
- `area_code` - 3-digit area code
- `inbound_agent_id` - Bound inbound agent
- `outbound_agent_id` - Bound outbound agent
- `last_modification_timestamp` - Unix timestamp in milliseconds

---

### 2. Import Phone Number (SIP Trunk)

Import your own phone numbers via SIP trunking from any provider.

```typescript
const phoneNumberResponse = await client.phoneNumber.import({
  phone_number: '+14157774444',
  termination_uri: 'someuri.pstn.twilio.com',
  sip_trunk_auth_username: 'username',      // optional
  sip_trunk_auth_password: 'password',      // optional
  inbound_agent_id: 'oBeDLoLOeuAbiuaMFXRtDOLriTJ5tSxD',
  outbound_agent_id: 'oBeDLoLOeuAbiuaMFXRtDOLriTJ5tSxD',
  inbound_agent_version: 1,                 // optional
  outbound_agent_version: 1,                // optional
  nickname: 'Frontdesk Number',             // optional
  inbound_webhook_url: 'https://example.com/webhook'  // optional
});
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `phone_number` | Yes | E.164 format number (+country code, no spaces) |
| `termination_uri` | Yes | SIP trunk endpoint for outbound calls (e.g., `someuri.pstn.twilio.com`) |
| `sip_trunk_auth_username` | No | SIP trunk authentication username |
| `sip_trunk_auth_password` | No | SIP trunk authentication password |
| `inbound_agent_id` | No | Agent for receiving calls (null = no inbound) |
| `outbound_agent_id` | No | Agent for making calls (null = no outbound) |
| `inbound_agent_version` | No | Version of inbound agent (defaults to latest) |
| `outbound_agent_version` | No | Version of outbound agent (defaults to latest) |
| `nickname` | No | Your reference name for the number |
| `inbound_webhook_url` | No | Webhook for per-call overrides |

---

### 3. List Phone Numbers

Retrieve all phone numbers in your account.

```typescript
const phoneNumberResponses = await client.phoneNumber.list();
console.log(phoneNumberResponses);
```

Returns an array of phone number objects with all their properties.

---

### 4. Get Phone Number

Retrieve details for a specific phone number.

```typescript
const phoneNumberResponse = await client.phoneNumber.retrieve('+14157774444');
console.log(phoneNumberResponse.inbound_agent_id);
```

---

### 5. Update Phone Number

Modify phone number configuration (agent bindings, nickname, webhooks).

```typescript
const phoneNumberResponse = await client.phoneNumber.update('+14157774444', {
  inbound_agent_id: 'oBeDLoLOeuAbiuaMFXRtDOLriTJ5tSxD',
  outbound_agent_id: 'oBeDLoLOeuAbiuaMFXRtDOLriTJ5tSxD',
  nickname: 'Updated Frontdesk',
  inbound_webhook_url: 'https://example.com/new-webhook'
});
```

**Updatable fields:**
- `inbound_agent_id`
- `outbound_agent_id`
- `inbound_agent_version`
- `outbound_agent_version`
- `nickname`
- `inbound_webhook_url`

**Note:** To update SIP trunk configuration (termination URI, credentials), you must delete and re-import the number.

---

### 6. Delete Phone Number

Remove a phone number from Retell.

```typescript
await client.phoneNumber.delete('+14157774444');
```

---

## SIP Trunk Integration

Retell supports two methods for integrating custom telephony via SIP trunking.

### Method 1: Elastic SIP Trunking (Recommended)

Best for providers that support elastic SIP trunking. Provides full feature support including call transfer.

#### Setup Process

1. **Configure Your SIP Trunk Provider**
   - Set origination URI to: `sip:5t4n6j0wnrl.sip.livekit.cloud`
   - For inbound issues, use TCP: `sip:5t4n6j0wnrl.sip.livekit.cloud;transport=tcp`
   - Configure authentication:
     - **Option A:** Whitelist Retell's IP ranges (US: `143.223.88.0/21`, `161.115.160.0/19`)
     - **Option B:** Use username/password authentication (recommended as Retell has no static IP)

2. **Import Number to Retell**
   ```typescript
   const phoneNumber = await client.phoneNumber.import({
     phone_number: '+14157774444',
     termination_uri: 'your-trunk.pstn.twilio.com',
     sip_trunk_auth_username: 'your_username',
     sip_trunk_auth_password: 'your_password',
     inbound_agent_id: 'agent_id_here',
     outbound_agent_id: 'agent_id_here'
   });
   ```

3. **Configure Provider for Inbound**
   - Point your number to Retell's SIP URI
   - Format: `sip:+14157774444@5t4n6j0wnrl.sip.livekit.cloud`

#### Supported Features
- Inbound and outbound calls
- Call transfer (including SIP REFER)
- All Retell telephony features
- Appears in dashboard like native numbers

---

### Method 2: Dial to SIP Endpoint

For providers without elastic SIP trunking support or complex telephony setups.

#### Setup Process

1. **Register the Call**
   ```typescript
   const phoneCallResponse = await client.call.registerPhoneCall({
     agent_id: 'oBeDLoLOeuAbiuaMFXRtDOLriTJ5tSxD',
     from_number: '+12137771234',  // optional
     to_number: '+12137771235',    // optional
     direction: 'inbound'          // optional
   });
   ```

2. **Dial to SIP Endpoint**
   - Use the returned `call_id` to construct SIP URI
   - Format: `sip:{call_id}@5t4n6j0wnrl.sip.livekit.cloud`

#### Example with Twilio
```typescript
import { VoiceResponse } from 'twilio/lib/twiml/VoiceResponse';

server.app.post('/voice-webhook', async (req, res) => {
  // Register the call
  const phoneCallResponse = await client.call.registerPhoneCall({
    agent_id: 'oBeDLoLOeuAbiuaMFXRtDOLriTJ5tSxD',
    from_number: '+12137771234',
    to_number: '+12137771235',
    direction: 'inbound'
  });
  
  // Dial to Retell
  const voiceResponse = new VoiceResponse();
  const dial = voiceResponse.dial();
  dial.sip(`sip:${phoneCallResponse.call_id}@5t4n6j0wnrl.sip.livekit.cloud`);
  
  res.set('Content-Type', 'text/xml');
  res.send(voiceResponse.toString());
});
```

#### Limitations
- Built-in call transfer feature unavailable (Retell won't send SIP REFER)
- Custom transfer logic required via custom functions
- All calls appear as inbound to Retell
- Must specify call direction manually

---

## Phone Number Types

Retell supports three phone number types:

| Type | Description |
|------|-------------|
| `retell-twilio` | Numbers purchased through Retell (Twilio backend) |
| `retell-telnyx` | Numbers purchased through Retell (Telnyx backend) |
| `custom` | Numbers imported via SIP trunk |

---

## Common Workflows

### Provisioning Numbers for Multiple Agents

```typescript
const agents = [
  { id: 'agent_sales', nickname: 'Sales Line' },
  { id: 'agent_support', nickname: 'Support Line' },
  { id: 'agent_billing', nickname: 'Billing Line' }
];

for (const agent of agents) {
  const number = await client.phoneNumber.create();
  await client.phoneNumber.update(number.phone_number, {
    inbound_agent_id: agent.id,
    outbound_agent_id: agent.id,
    nickname: agent.nickname
  });
  console.log(`${agent.nickname}: ${number.phone_number}`);
}
```

### Bulk Import Numbers from SIP Provider

```typescript
const numbersToImport = [
  { number: '+14151234567', agent: 'agent_id_1' },
  { number: '+14157654321', agent: 'agent_id_2' }
];

const imported = await Promise.all(
  numbersToImport.map(item => 
    client.phoneNumber.import({
      phone_number: item.number,
      termination_uri: 'mytrunk.pstn.twilio.com',
      sip_trunk_auth_username: 'username',
      sip_trunk_auth_password: 'password',
      inbound_agent_id: item.agent,
      outbound_agent_id: item.agent
    })
  )
);

console.log(`Imported ${imported.length} numbers`);
```

### Updating Agent Assignments

```typescript
// Get all numbers
const numbers = await client.phoneNumber.list();

// Update specific numbers to new agent
for (const number of numbers) {
  if (number.nickname?.includes('Sales')) {
    await client.phoneNumber.update(number.phone_number, {
      inbound_agent_id: 'new_sales_agent_id',
      outbound_agent_id: 'new_sales_agent_id'
    });
  }
}
```

---

## Best Practices

### Authentication
- **SIP Trunk Auth:** Use username/password authentication rather than IP whitelisting (Retell has no static IPs except for US traffic)
- **API Keys:** Store API keys in environment variables, never in code

### Agent Binding
- Set both `inbound_agent_id` and `outbound_agent_id` for bidirectional functionality
- Use `null` to disable inbound or outbound on a number
- Leverage agent versions for staged rollouts

### Webhooks
- Use `inbound_webhook_url` for dynamic per-call configuration
- Override agents, set variables, or modify call settings dynamically
- Implement proper webhook validation

### SIP Configuration
- Test connectivity before bulk imports
- Check provider logs for troubleshooting
- Use TCP transport if SDP issues occur: `;transport=tcp`
- For static IP requirements, consider using Jambonz as intermediary

### Number Management
- Use `nickname` field for organizational reference
- List and audit numbers regularly
- Clean up unused numbers to reduce costs

---

## Error Handling

```typescript
try {
  const number = await client.phoneNumber.import({
    phone_number: '+14157774444',
    termination_uri: 'mytrunk.pstn.twilio.com'
  });
  console.log('Number imported:', number.phone_number);
} catch (error) {
  if (error.statusCode === 400) {
    console.error('Invalid request:', error.message);
  } else if (error.statusCode === 401) {
    console.error('Authentication failed');
  } else if (error.statusCode === 500) {
    console.error('Server error:', error.message);
  }
}
```

---

## Additional Resources

- **API Documentation:** https://docs.retellai.com/api-references
- **TypeScript SDK:** https://github.com/RetellAI/retell-typescript-sdk
- **Custom Telephony Guide:** https://docs.retellai.com/make-calls/custom-telephony
- **Retell Discord:** Community support and discussions
- **Status Page:** Monitor Retell service status

---

## Important Notes

1. **SIP Trunk Updates:** To change termination URI or credentials, you must delete and re-import the number
2. **No Static IP:** Retell's SIP server lacks static IPs except for US traffic (use credential auth)
3. **US IP Ranges:** `143.223.88.0/21`, `161.115.160.0/19`
4. **Call Transfer:** Only works with Method 1 (Elastic SIP Trunking)
5. **E.164 Format:** All phone numbers must use E.164 format (+country code, no spaces/special chars)
6. **Rate Limits:** Consult API documentation for current rate limits

---

## Troubleshooting

### Inbound Calls Not Connecting
- Check origination settings in SIP trunk provider
- Verify Retell's SIP URI is correctly configured
- Review provider logs
- Try TCP transport: `;transport=tcp`

### Outbound Calls Not Connecting
- Verify termination URI is correct
- Check SIP trunk authentication credentials
- Ensure provider allows outbound to PSTN
- Review provider logs

### Call Quality Issues
- Verify network connectivity and bandwidth
- Check for packet loss or jitter
- Review SIP trunk provider's quality metrics
- Consider geographic proximity to Retell's servers

---

## Version Information

This documentation is based on Retell AI's current API as of November 2024. Always refer to the official documentation for the latest updates and features.
