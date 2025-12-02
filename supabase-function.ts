/**
 * Supabase Edge Function: Shopify Order Tracking Links
 * NO Track123 - Direct Shopify only!
 * 
 * Copy this entire file into your Supabase Edge Function
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ==========================================
// CARRIER URL BUILDERS
// ==========================================

function normalizeCarrier(value: string | null): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildCarrierUrl(carrier: string | null, trackingNumber: string): string | null {
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

function guessCarrierByTrackingNumber(trackingNumber: string): string | null {
  const tn = (trackingNumber || '').trim().toUpperCase();
  if (!tn) return null;
  
  // USPS: 20-22 digits starting 92/93/94/95, or S10 format ending US
  if (/^(92|93|94|95)\d{18,22}$/.test(tn) || /^[A-Z]{2}\d{9}US$/.test(tn)) return 'usps';
  // UPS: starts with 1Z
  if (/^1Z[A-Z0-9]{16,18}$/i.test(tn)) return 'ups';
  // FedEx: 12, 15, 20, or 22 digits
  if (/^\d{12}$/.test(tn) || /^\d{15}$/.test(tn) || /^\d{20}$/.test(tn) || /^\d{22}$/.test(tn)) return 'fedex';
  // Australia Post: S10 ending AU
  if (/^[A-Z]{2}\d{9}AU$/.test(tn)) return 'auspost';
  // Royal Mail: S10 ending GB
  if (/^[A-Z]{2}\d{9}GB$/.test(tn)) return 'royalmail';
  // Canada Post: 16 digits
  if (/^\d{16}$/.test(tn)) return 'canadapost';
  
  return null;
}

function buildParcelsAppUrl(trackingNumber: string): string {
  return `https://parcelsapp.com/en/tracking/${encodeURIComponent(trackingNumber)}`;
}

// ==========================================
// SHOPIFY API
// ==========================================

async function fetchOrderByName(orderName: string, shopDomain: string, adminToken: string) {
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

  const resp = await fetch(`https://${shopDomain}/admin/api/2024-07/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
    },
    body: JSON.stringify({ query, variables: { search: `name:${orderName}` } }),
  });

  const json = await resp.json();
  const node = json?.data?.orders?.edges?.[0]?.node;
  if (!node) return null;

  const trackingInfo = node.fulfillments?.[0]?.trackingInfo?.[0] || null;
  const trackingNumber = trackingInfo?.number || null;
  const carrier = trackingInfo?.company || null;

  let carrierUrl: string | null = null;
  let parcelsLink: string | null = null;

  if (trackingNumber) {
    // Try carrier name first
    carrierUrl = carrier ? buildCarrierUrl(carrier, trackingNumber) : null;
    // If no match, guess from tracking number format
    if (!carrierUrl) {
      const guessed = guessCarrierByTrackingNumber(trackingNumber);
      if (guessed) carrierUrl = buildCarrierUrl(guessed, trackingNumber);
    }
    // Always build Parcels App URL
    parcelsLink = buildParcelsAppUrl(trackingNumber);
  }

  return {
    orderName: node.name,
    orderNumericId: node.id?.split('/').pop() || null,
    trackingNumber,
    carrier,
    carrierUrl,
    parcelsLink,
  };
}

async function fetchOrdersByEmail(email: string, shopDomain: string, adminToken: string) {
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

  const resp = await fetch(`https://${shopDomain}/admin/api/2024-07/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
    },
    body: JSON.stringify({ query, variables: { search: `email:${email}` } }),
  });

  const json = await resp.json();
  const edges = json?.data?.orders?.edges || [];

  return edges.map((edge: any) => {
    const node = edge.node;
    const trackingInfo = node.fulfillments?.[0]?.trackingInfo?.[0] || null;
    const trackingNumber = trackingInfo?.number || null;

    return {
      orderName: node.name,
      orderNumericId: node.id?.split('/').pop() || null,
      trackingNumber,
      createdAt: node.createdAt,
    };
  });
}

// ==========================================
// MAIN HANDLER
// ==========================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { orderName, email } = body;

    // Get secrets from environment
    const SHOPIFY_STORE_DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN");
    const SHOPIFY_ADMIN_ACCESS_TOKEN = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");

    if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Missing Shopify credentials in secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SEARCH BY EMAIL - returns list of orders
    if (email && typeof email === "string") {
      const orders = await fetchOrdersByEmail(
        email.trim().toLowerCase(),
        SHOPIFY_STORE_DOMAIN,
        SHOPIFY_ADMIN_ACCESS_TOKEN
      );

      if (!orders || orders.length === 0) {
        return new Response(
          JSON.stringify({ error: "No orders found for this email", orders: [] }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          email: email.trim().toLowerCase(),
          orders,
          latestOrder: orders[0] || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SEARCH BY ORDER NAME - returns tracking links
    if (!orderName || typeof orderName !== "string") {
      return new Response(
        JSON.stringify({ error: "orderName or email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const name = orderName.trim().startsWith("#") ? orderName.trim() : `#${orderName.trim()}`;

    const order = await fetchOrderByName(name, SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN);

    if (!order) {
      return new Response(
        JSON.stringify({ error: "Order not found in Shopify" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return Zendesk-compatible format
    return new Response(
      JSON.stringify({
        orderNumericId: order.orderNumericId,
        trackingNumber: order.trackingNumber,
        courierQueryLink: order.carrierUrl,
        parcelsLink: order.parcelsLink,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error)?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

