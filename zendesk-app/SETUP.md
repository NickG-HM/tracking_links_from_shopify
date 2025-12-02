# Zendesk App Setup

## Prerequisites

1. Deploy the server (see main README)
2. Note your deployed server URL

## Installation

### Step 1: Update API URL

Edit `assets/iframe.js` line 7:

```javascript
// Change this:
const apiBaseUrl = 'YOUR_DEPLOYED_SERVER_URL/api/links';

// To your actual URL, e.g.:
const apiBaseUrl = 'https://your-app.onrender.com/api/links';
```

### Step 2: Create ZIP

Zip the entire `zendesk-app` folder:

```bash
cd zendesk-app
zip -r ../zendesk-tracking-app.zip .
```

### Step 3: Upload to Zendesk

1. Go to Zendesk Admin Center
2. Apps and integrations → Zendesk Support apps
3. Click "Upload private app"
4. Upload the ZIP file
5. Install the app

## How It Works

1. App automatically detects customer email from ticket
2. Searches Shopify for orders with that email
3. Displays tracking links with one-click copy

## Troubleshooting

**"No orders found"**
- Check if customer email matches Shopify order email
- Verify server is running and accessible

**"Failed to fetch"**
- Check `apiBaseUrl` is correct
- Ensure server allows CORS from Zendesk domains

**Links not appearing**
- Order may not have tracking info yet
- Check Shopify fulfillment has tracking number
