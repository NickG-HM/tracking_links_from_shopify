(function() {
  'use strict';

  const client = ZAFClient.init();
  
  // Supabase Edge Function URL
  const apiBaseUrl = 'https://lrjemtcgiiscpfzypftx.supabase.co/functions/v1/links';
  
  let customerOrders = [];

  // Get orders by customer email
  async function getOrdersByEmail() {
    try {
      const ticketData = await client.get(['ticket.requester']);
      const requester = ticketData['ticket.requester'];
      
      if (!requester?.email) return { orders: [], latestOrder: null };
      
      const response = await fetch(apiBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: requester.email })
      });
      
      if (!response.ok) return { orders: [], latestOrder: null };
      
      const data = await response.json();
      return {
        orders: data.orders || [],
        latestOrder: data.latestOrder || data.orders?.[0] || null
      };
    } catch (error) {
      console.error('Error:', error);
      return { orders: [], latestOrder: null };
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function showOrderSelector(orders, orderNameInput, onOrderChange) {
    const existing = document.getElementById('orderSelector');
    if (existing) existing.remove();
    if (orders.length <= 1) return;
    
    const container = document.createElement('div');
    container.id = 'orderSelector';
    container.className = 'order-selector';
    
    const label = document.createElement('div');
    label.className = 'selector-label';
    label.textContent = `${orders.length} orders found:`;
    container.appendChild(label);
    
    const select = document.createElement('select');
    select.className = 'order-select';
    
    orders.forEach((order, i) => {
      const option = document.createElement('option');
      option.value = order.orderName;
      option.textContent = `${order.orderName}${order.createdAt ? ' — ' + order.createdAt : ''}${i === 0 ? ' (latest)' : ''}`;
      select.appendChild(option);
    });
    
    select.addEventListener('change', async () => {
      orderNameInput.value = select.value;
      if (onOrderChange) await onOrderChange();
    });
    
    container.appendChild(select);
    
    const inputRow = orderNameInput.closest('.row');
    if (inputRow?.parentNode) {
      inputRow.parentNode.insertBefore(container, inputRow.nextSibling);
    }
  }

  const svgCopy = () => '<svg class="copy-icon" viewBox="0 0 24 24"><path d="M9 9V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2v-2h2V7h-6v2H9Z"/><path d="M5 9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9Zm2 0v8h6V9H7Z"/></svg>';

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      } catch {
        document.body.removeChild(ta);
        return false;
      }
    }
  }

  function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = msg;
      toast.className = 'toast' + (isError ? ' error' : '');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }
  }

  async function init() {
    const form = document.getElementById('trackForm');
    const output = document.getElementById('output');
    const status = document.getElementById('status');
    const orderNameInput = document.getElementById('orderName');

    async function searchTrackingLinks() {
      const orderNameRaw = orderNameInput.value.trim();
      if (!orderNameRaw) return;
      
      output.style.display = 'none';
      output.innerHTML = '';
      status.textContent = 'Loading...';
      status.className = 'status';

      const orderName = orderNameRaw.startsWith('#') ? orderNameRaw : `#${orderNameRaw}`;

      try {
        const response = await fetch(apiBaseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderName })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Request failed');
        }

        const data = await response.json();
        status.textContent = '';

        const carrierLink = data.courierQueryLink;
        const parcelsLink = data.parcelsLink;

        const blocks = [];

        // Carrier link
        if (carrierLink) {
          blocks.push(`
            <div class="section block">
              <div class="label">Carrier</div>
              <div class="link-row">
                <button class="copy-btn" data-copy="${carrierLink.replace(/"/g, '&quot;')}">${svgCopy()}<span>Copy</span></button>
                <a class="link" href="${carrierLink}" target="_blank">${carrierLink}</a>
              </div>
            </div>
          `);
        }

        // Parcels App link
        if (parcelsLink) {
          blocks.push(`
            <div class="section block">
              <div class="label">Universal</div>
              <div class="link-row">
                <button class="copy-btn" data-copy="${parcelsLink.replace(/"/g, '&quot;')}">${svgCopy()}<span>Copy</span></button>
                <a class="link" href="${parcelsLink}" target="_blank">${parcelsLink}</a>
              </div>
            </div>
          `);
        }

        // Copy both button
        if (carrierLink || parcelsLink) {
          const both = [carrierLink, parcelsLink].filter(Boolean).join('\n');
          blocks.push(`
            <div class="section">
              <button class="btn secondary full" id="copyBoth" data-copy="${both.replace(/"/g, '&quot;')}">${svgCopy()}<span>Copy both</span></button>
              <div id="toast" class="toast"></div>
            </div>
          `);
        } else {
          blocks.push(`<div class="section">No tracking links found.</div>`);
        }

        output.innerHTML = blocks.join('');
        output.style.display = 'block';

        output.querySelectorAll('[data-copy]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const ok = await copyText(btn.getAttribute('data-copy'));
            showToast(ok ? 'Copied!' : 'Failed', !ok);
          });
        });

      } catch (err) {
        status.textContent = err.message || 'Failed';
        status.className = 'status error';
      }
    }

    async function loadOrders() {
      const result = await getOrdersByEmail();
      customerOrders = result.orders;
      
      if (result.latestOrder?.orderName) {
        orderNameInput.value = result.latestOrder.orderName;
        if (customerOrders.length > 1) {
          showOrderSelector(customerOrders, orderNameInput, searchTrackingLinks);
        }
        await searchTrackingLinks();
        return true;
      }
      return false;
    }

    let loaded = await loadOrders();
    
    if (!loaded) {
      let retries = 0;
      const interval = setInterval(async () => {
        retries++;
        loaded = await loadOrders();
        if (loaded || retries >= 3) clearInterval(interval);
      }, 2000);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await searchTrackingLinks();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
