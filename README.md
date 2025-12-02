# Shopify Order Tracking Links

Simple tool to get tracking links from Shopify orders - **without burning Track123 API quota**.

## What It Does

- Fetches order data directly from Shopify
- Returns carrier tracking links (USPS, FedEx, UPS, DHL, etc.)
- Returns universal [Parcels App](https://parcelsapp.com/) fallback link
- Works with Zendesk sidebar app

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/NickG-HM/tracking_links_from_shopify.git
cd tracking_links_from_shopify
npm install
```

### 2. Configure Environment

Create a `.env` file:

```
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxx
PORT=3000
```

**Get Shopify credentials:**
1. Shopify Admin → Settings → Apps → Develop apps
2. Create app with `read_orders` permission
3. Install and copy Admin API access token

### 3. Run

```bash
npm start
```

Open http://localhost:3000

## API Endpoints

### `POST /api/lookup`
Search orders by customer email.

```json
{ "email": "customer@example.com" }
```

### `POST /api/links`
Get tracking links for specific order (Zendesk-compatible).

```json
{ "orderName": "#123456" }
```

**Response:**
```json
{
  "orderNumericId": "123456",
  "trackingNumber": "1Z999AA10123456784",
  "courierQueryLink": "https://www.ups.com/track?tracknum=...",
  "parcelsLink": "https://parcelsapp.com/en/tracking/..."
}
```

## Deploy

Deploy to any Node.js host (Render, Railway, Heroku, etc.):

1. Set environment variables in host dashboard
2. Deploy
3. Update Zendesk app's `apiBaseUrl` to your deployed URL

## Supported Carriers

USPS, UPS, FedEx, DHL, Canada Post, Royal Mail, Australia Post, YunExpress, 4PX, Yanwen, PostNL, Deutsche Post, Hermes/Evri, GLS, TNT, SF Express, Cainiao, Amazon Logistics

Unknown carriers fall back to [Parcels App](https://parcelsapp.com/) universal tracking.

## Zendesk App

The `zendesk-app/` folder contains a Zendesk sidebar app that integrates with this API.

**To use:**
1. Deploy this server
2. Update `apiBaseUrl` in `zendesk-app/assets/iframe.js`
3. Zip the `zendesk-app/` folder
4. Upload to Zendesk Admin → Apps → Manage → Upload private app

## License

MIT

