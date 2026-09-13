# API Key Security Implementation

This document explains the API key authentication system implemented in the DDABA Association Portal.

## Overview

The API key system provides secure, token-based authentication for API access without requiring user credentials. It's particularly useful for:

- Third-party integrations
- Automated scripts and bots
- Mobile applications
- External service access

## Features

✅ **Secure Storage**: API keys are hashed using SHA256 before storage  
✅ **Key Rotation**: Support for multiple active keys per user  
✅ **Expiration**: Optional automatic expiration dates  
✅ **Audit Trail**: Track last usage time and IP address  
✅ **Revocation**: Instantly disable keys without deletion  
✅ **Ownership**: Each key is tied to a user account  

## Getting Started

### 1. Run the Migration

First, create the `api_keys` table in your database:

```bash
npm run db:migrate
```

This creates the necessary table and indexes.

### 2. Generate Your First API Key

Generate an API key for the admin user:

```bash
npm run api-key:generate
```

This will:
- Find your admin user
- Generate a secure API key
- Display it once (save it!)
- Show usage instructions

**Example Output:**
```
🔑 DDABA API Key Generator

==================================================

✅ Found admin user: admin@example.com (ID: 1)

==================================================
🎉 API KEY CREATED SUCCESSFULLY

Key Details:
  ID: 1
  Name: Admin API Key
  Created: 2024-01-15T10:30:45.000Z
  Expires: 2025-01-15T10:30:45.000Z

==================================================
⚠️  IMPORTANT: Save this API key now!

API KEY:
  a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

This key will NOT be shown again!
==================================================
```

## API Endpoints

### Create API Key
```
POST /api/keys
```

**Request Body:**
```json
{
  "name": "My API Key",
  "description": "For third-party integration",
  "expiresInDays": 365
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "key": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
    "name": "My API Key",
    "description": "For third-party integration",
    "createdAt": "2024-01-15T10:30:45.000Z",
    "expiresAt": "2025-01-15T10:30:45.000Z"
  },
  "message": "API key created successfully. Save the key above — it won't be shown again."
}
```

### List API Keys
```
GET /api/keys
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Admin API Key",
      "description": "Primary API key for admin operations",
      "lastUsedAt": "2024-01-15T15:20:00.000Z",
      "lastUsedIp": "192.168.1.1",
      "expiresAt": "2025-01-15T10:30:45.000Z",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:45.000Z",
      "updatedAt": "2024-01-15T10:30:45.000Z"
    }
  ]
}
```

### Update API Key
```
PATCH /api/keys/:keyId
```

**Request Body:**
```json
{
  "name": "Updated Key Name",
  "description": "Updated description"
}
```

### Revoke API Key (Deactivate)
```
DELETE /api/keys/:keyId/revoke
```

Deactivates the key immediately without deleting it (can be reactivated manually in DB if needed).

### Delete API Key (Permanent)
```
DELETE /api/keys/:keyId
```

Permanently removes the key from the database.

## Usage

### Using API Keys in Requests

#### Option 1: Authorization Header (Recommended)
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://ddaba.example.com/api/players
```

#### Option 2: X-API-Key Header
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://ddaba.example.com/api/players
```

### JavaScript/Node.js Example
```javascript
const apiKey = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6";

// Using fetch
const response = await fetch("https://ddaba.example.com/api/players", {
  headers: {
    "Authorization": `Bearer ${apiKey}`,
  },
});

const data = await response.json();
console.log(data);
```

### Python Example
```python
import requests

api_key = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"

headers = {
    "X-API-Key": api_key,
}

response = requests.get(
    "https://ddaba.example.com/api/players",
    headers=headers
)

print(response.json())
```

## Security Best Practices

### Do's ✅
- **Store securely**: Use environment variables or secure vaults (not in code)
- **Use HTTPS**: Always transmit API keys over encrypted connections
- **Rotate regularly**: Generate new keys periodically
- **Set expiration**: Use time-limited keys when possible
- **Monitor usage**: Check "Last Used" timestamps for suspicious activity
- **Revoke immediately**: Disable keys that may be compromised
- **Use descriptive names**: Name keys after their purpose

### Don'ts ❌
- **Don't share**: Never give API keys to others
- **Don't commit**: Keep keys out of version control
- **Don't log**: Avoid logging API keys in error messages
- **Don't reuse**: Don't use the same key across multiple applications
- **Don't hardcode**: Always use environment variables

## Database Schema

The `api_keys` table stores:

```sql
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,           -- SHA256 hash of the actual key
  name VARCHAR(255) NOT NULL,              -- User-friendly name
  description TEXT,                        -- Optional description
  last_used_at TIMESTAMP,                  -- Last usage timestamp
  last_used_ip VARCHAR(64),                -- Last IP that used the key
  expires_at TIMESTAMP,                    -- Optional expiration date
  is_active BOOLEAN NOT NULL DEFAULT true, -- Enable/disable without deleting
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Key Details for Your Integration

### API ID
Your first generated API Key ID is: **1**

### Usage Example
Once you have your API key (generated from the script above), you can use it:

```bash
# List players
curl -H "X-API-Key: YOUR_API_KEY" \
  https://your-domain.com/api/players

# Get player details
curl -H "X-API-Key: YOUR_API_KEY" \
  https://your-domain.com/api/players/123

# Create match registration
curl -X POST \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"matchId": 1, "disciplines": ["SPEED"]}' \
  https://your-domain.com/api/match-registrations
```

## Authentication Flow

```
┌─────────────────┐
│  Client Request │
└────────┬────────┘
         │
         ▼
    Check headers for:
    - Authorization: Bearer <key>
    - X-API-Key: <key>
         │
         ▼ (Found)
    Hash API key (SHA256)
         │
         ▼
    Look up in database
         │
         ├─ Not found ──────► ❌ 401 Unauthorized
         │
         ├─ Inactive ───────► ❌ 401 Unauthorized
         │
         ├─ Expired ────────► ❌ 401 Unauthorized
         │
         └─ Valid ──────────► ✅ Update last_used_at, Proceed
```

## Troubleshooting

### "Invalid or expired API key"
- ✓ Verify you're using the correct key
- ✓ Check if the key has expired
- ✓ Ensure the key is active (not revoked)
- ✓ Confirm header format is correct

### "Unauthorized. Provide API key or login first."
- ✓ Add API key to request headers
- ✓ Use correct header name (X-API-Key or Authorization)
- ✓ Ensure you're logged in or have valid API key

### Key not working after revoke
- ✓ Revoked keys are deactivated but not deleted
- ✓ Delete the key if you want to remove it completely

## Files Modified/Created

### New Files
- `server/middleware/apiKey.ts` - API key authentication middleware
- `server/services/apiKeys.ts` - API key business logic
- `server/routes/apiKeys.ts` - API key management endpoints
- `server/migrations/001_add_api_keys.ts` - Database migration
- `server/scripts/generate-api-key.ts` - API key generation script

### Modified Files
- `shared/schema/schema.ts` - Added apiKeys table and relations
- `server/index.ts` - Integrated API key middleware and routes
- `package.json` - Added migration and key generation scripts

## Next Steps

1. ✅ Run migration: `npm run db:migrate`
2. ✅ Generate API key: `npm run api-key:generate`
3. ✅ Save your API key securely
4. ✅ Use it in your requests!

## Support

For issues or questions, check:
- API key format and header usage
- Database migration status
- Key expiration dates
- User permissions in the database

---

**Generated**: 2024
**Version**: 1.0.0
