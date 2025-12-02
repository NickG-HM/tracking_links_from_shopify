# Simple Order Tracker Setup

## Why This Exists

The original system was calling Track123 API for **every single order lookup**, burning through your API quota. 

**This new version uses ONLY Shopify** - no Track123 calls at all! 🎉

Shopify already has all the tracking info you need:
- Tracking numbers
- Carrier names  
- Tracking URLs

---

## Quick Setup (5 minutes)

### Step 1: Create your `.env` file

In the `simple-tracker` folder, create a file called `.env` with:

```
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxx
PORT=3000
```

**Where to get these:**
1. Go to your Shopify Admin
2. Settings → Apps and sales channels → Develop apps
3. Create app (or use existing) with `read_orders` permission
4. Install app → get Admin API access token

### Step 2: Install dependencies

```bash
cd simple-tracker
npm install
```

### Step 3: Run it!

```bash
npm start
```

Then open: **http://localhost:3000**

---

## How It Works

1. You enter a customer email
2. App searches Shopify for orders with that email
3. Shows all orders with:
   - Order number & date
   - Payment & fulfillment status
   - Items ordered
   - Tracking number + link (if shipped)

**The tracking URL comes from:**
1. First: Shopify's built-in tracking URL (from fulfillment)
2. Fallback: We build a URL based on carrier name (USPS, UPS, FedEx, etc.)
3. Last resort: Universal tracker (Parcels App)

---

## What's Different from Before

| Before (Track123) | Now (Shopify-only) |
|-------------------|-------------------|
| 2 API calls per lookup | 1 API call per lookup |
| Burns Track123 quota | Zero Track123 usage |
| Needs Track123 subscription | Free (just Shopify) |
| Complex carrier matching | Simple, direct |

---

## Supported Carriers

The app can build tracking URLs for:
- USPS
- UPS
- FedEx
- DHL (Express & eCommerce)
- Canada Post
- Royal Mail
- Australia Post
- YunExpress
- 4PX
- Yanwen
- PostNL
- Deutsche Post

For any other carrier, it falls back to Parcels App (universal tracker).

