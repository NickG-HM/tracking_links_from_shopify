/**
 * Simple Order Tracker - Shopify Only (No Track123)
 * 
 * This server fetches order and tracking data directly from Shopify,
 * eliminating the need for Track123 API calls.
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CORS for Zendesk
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (origin.includes('zendesk.com') || origin.includes('localhost') || origin.includes('github.io')) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ==========================================
// CARRIER URL BUILDERS
// ==========================================

function normalizeCarrier(value) {
  return (value || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildCarrierUrl(carrier, trackingNumber) {
  const c = normalizeCarrier(carrier);
  const tn = encodeURIComponent(trackingNumber);

  if (c.includes('usps') || c.includes('unitedstatespostalservice')) {
    return `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${tn}`;
  }
  if (c === 'ups' || (c.includes('ups') && !c.includes('usps'))) {
    return `https://www.ups.com/track?loc=en_US&tracknum=${tn}`;
  }
  if (c.includes('fedex')) {
    return `https://www.fedex.com/fedextrack/?trknbr=${tn}`;
  }
  if (c === 'dhl' || c === 'dhlexpress' || c.includes('dhlexpress')) {
    return `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${tn}`;
  }
  if (c.includes('dhlecommerce') || c.includes('dhlglobalmail')) {
    return `https://www.dhl.com/us-en/home/tracking/tracking-ecommerce.html?tracking-id=${tn}`;
  }
  if (c.includes('dhl')) {
    return `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${tn}`;
  }
  if (c.includes('canadapost') || c.includes('postescanada')) {
    return `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${tn}`;
  }
  if (c.includes('royalmail')) {
    return `https://www.royalmail.com/track-your-item#/tracking-results/${tn}`;
  }
  if (c.includes('auspost') || c.includes('australiapost')) {
    return `https://auspost.com.au/mypost/track/#/details/${tn}`;
  }
  if (c.includes('yunexpress')) {
    return `https://www.yuntrack.com/Track/Detail/${tn}`;
  }
  if (c.includes('4px')) {
    return `https://track.4px.com/#/result/0/${tn}`;
  }
  if (c.includes('yanwen')) {
    return `https://track.yw56.com.cn/en/querydel?nums=${tn}`;
  }
  if (c.includes('postnl')) {
    return `https://postnl.nl/tracktrace/?B=${tn}`;
  }
  if (c.includes('deutschepost')) {
    return `https://www.deutschepost.de/de/s/sendungsverfolgung.html?piececode=${tn}`;
  }
  if (c.includes('hermes') || c.includes('evri')) {
    return `https://www.evri.com/track-a-parcel/${tn}`;
  }
  if (c.includes('gls')) {
    return `https://gls-group.com/track/${tn}`;
  }
  if (c.includes('tnt')) {
    return `https://www.tnt.com/express/en_us/site/tracking.html?searchType=con&cons=${tn}`;
  }
  if (c.includes('chinapost') || c.includes('epacket') || c.includes('ems')) {
    return `https://parcelsapp.com/en/tracking/${tn}`;
  }
  if (c.includes('sfexpress') || c.includes('shunfeng')) {
    return `https://www.sf-express.com/us/en/dynamic_function/waybill/#search/bill-number/${tn}`;
  }
  if (c.includes('cainiao')) {
    return `https://global.cainiao.com/detail.htm?mailNoList=${tn}`;
  }
  if (c.includes('lasership') || c.includes('ontrac')) {
    return `https://www.ontrac.com/tracking?number=${tn}`;
  }
  if (c.includes('amazon') || c.includes('amzl')) {
    return `https://track.amazon.com/tracking/${tn}`;
  }
  return null;
}

function guessCarrierByTrackingNumber(trackingNumber) {
  const tn = String(trackingNumber || '').trim().toUpperCase();
  if (!tn) return null;
  
  if (/^(92|93|94|95)\d{18,22}$/.test(tn) || /^[A-Z]{2}\d{9}US$/.test(tn)) return 'usps';
  if (/^1Z[A-Z0-9]{16,18}$/i.test(tn)) return 'ups';
  if (/^\d{12}$/.test(tn) || /^\d{15}$/.test(tn) || /^\d{20}$/.test(tn) || /^\d{22}$/.test(tn)) return 'fedex';
  if (/^[A-Z]{2}\d{9}AU$/.test(tn)) return 'auspost';
  if (/^[A-Z]{2}\d{9}GB$/.test(tn)) return 'royalmail';
  if (/^\d{16}$/.test(tn)) return 'canadapost';
  
  return null;
}

function buildParcelsAppUrl(trackingNumber) {
  return `https://parcelsapp.com/en/tracking/${encodeURIComponent(trackingNumber)}`;
}

// ==========================================
// SHOPIFY API FUNCTIONS
// ==========================================

async function fetchOrderByName(orderName) {
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!shopDomain || !adminToken) {
    throw new Error('Missing Shopify credentials');
  }

  const url = `https://${shopDomain}/admin/api/2024-07/graphql.json`;
  
  const query = `
    query($search: String!) {
      orders(first: 1, query: $search) {
        edges {
          node {
            id
            name
            createdAt
            displayFulfillmentStatus
            fulfillments {
              trackingInfo { number company url }
            }
          }
        }
      }
    }
  `;

  const resp = await axios.post(url, { query, variables: { search: `name:${orderName}` } }, {
    headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  if (resp.data.errors) throw new Error('Shopify error');

  const node = resp?.data?.data?.orders?.edges?.[0]?.node;
  if (!node) return null;

  const trackingInfo = node.fulfillments?.[0]?.trackingInfo?.[0] || null;
  const trackingNumber = trackingInfo?.number || null;
  const carrier = trackingInfo?.company || null;

  let carrierUrl = null;
  let parcelsAppUrl = null;

  if (trackingNumber) {
    carrierUrl = carrier ? buildCarrierUrl(carrier, trackingNumber) : null;
    if (!carrierUrl) {
      const guessed = guessCarrierByTrackingNumber(trackingNumber);
      if (guessed) carrierUrl = buildCarrierUrl(guessed, trackingNumber);
    }
    parcelsAppUrl = buildParcelsAppUrl(trackingNumber);
  }

  return {
    orderName: node.name,
    orderNumericId: node.id?.split('/').pop() || null,
    status: node.displayFulfillmentStatus || 'UNFULFILLED',
    tracking: { number: trackingNumber, carrier, carrierUrl, parcelsAppUrl }
  };
}

async function fetchOrdersByEmail(email) {
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!shopDomain || !adminToken) {
    throw new Error('Missing Shopify credentials');
  }

  const url = `https://${shopDomain}/admin/api/2024-07/graphql.json`;
  
  const query = `
    query($search: String!) {
      orders(first: 20, query: $search, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            createdAt
            displayFulfillmentStatus
            fulfillments {
              trackingInfo { number company url }
            }
          }
        }
      }
    }
  `;

  const resp = await axios.post(url, { query, variables: { search: `email:${email}` } }, {
    headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  if (resp.data.errors) throw new Error('Shopify error');

  const edges = resp?.data?.data?.orders?.edges || [];
  
  return edges.map(edge => {
    const node = edge.node;
    const trackingInfo = node.fulfillments?.[0]?.trackingInfo?.[0] || null;
    const trackingNumber = trackingInfo?.number || null;
    const carrier = trackingInfo?.company || null;

    let carrierUrl = null;
    let parcelsAppUrl = null;

    if (trackingNumber) {
      carrierUrl = carrier ? buildCarrierUrl(carrier, trackingNumber) : null;
      if (!carrierUrl) {
        const guessed = guessCarrierByTrackingNumber(trackingNumber);
        if (guessed) carrierUrl = buildCarrierUrl(guessed, trackingNumber);
      }
      parcelsAppUrl = buildParcelsAppUrl(trackingNumber);
    }

    return {
      orderName: node.name,
      orderNumericId: node.id?.split('/').pop() || null,
      date: new Date(node.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      status: node.displayFulfillmentStatus || 'UNFULFILLED',
      tracking: { number: trackingNumber, carrier, carrierUrl, parcelsAppUrl }
    };
  });
}

// ==========================================
// API ENDPOINTS
// ==========================================

// Lookup by email (for web UI)
app.post('/api/lookup', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const orders = await fetchOrdersByEmail(email.trim().toLowerCase());
    if (!orders.length) return res.status(404).json({ error: 'No orders found', orders: [] });

    return res.json({ email: email.trim().toLowerCase(), orderCount: orders.length, orders });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Lookup by order name or email (Zendesk-compatible)
app.post('/api/links', async (req, res) => {
  try {
    let { orderName, email } = req.body;

    // If email provided, return orders list
    if (email) {
      const orders = await fetchOrdersByEmail(email.trim().toLowerCase());
      if (!orders.length) return res.status(404).json({ error: 'No orders found', orders: [] });
      
      return res.json({
        email: email.trim().toLowerCase(),
        orders: orders.map(o => ({
          orderName: o.orderName,
          orderNumericId: o.orderNumericId,
          trackingNumber: o.tracking.number,
          createdAt: o.date
        })),
        latestOrder: orders[0] ? {
          orderName: orders[0].orderName,
          orderNumericId: orders[0].orderNumericId,
          trackingNumber: orders[0].tracking.number
        } : null
      });
    }

    // Otherwise lookup by order name
    if (!orderName) return res.status(400).json({ error: 'orderName or email required' });

    orderName = orderName.trim();
    if (!orderName.startsWith('#')) orderName = `#${orderName}`;

    const order = await fetchOrderByName(orderName);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    return res.json({
      orderNumericId: order.orderNumericId,
      trackingNumber: order.tracking.number,
      courierQueryLink: order.tracking.carrierUrl,
      parcelsLink: order.tracking.parcelsAppUrl
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'Shopify-only' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Order Tracker running at http://localhost:${PORT}\n`);
});
