// netlify/functions/leads.js
// Enquiries submitted through the site. Anyone can add one (that's the
// point of a contact form); only the admin password can read the list back.

import { getStore } from '@netlify/blobs';

const ADMIN_PASSWORD = 'Mishra ji';

function json(data, status = 200){
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export default async (req) => {
  const store = getStore('mpd-leads');

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));

    // Admin listing request: { action: 'list', password }
    if (body.action === 'list') {
      if (body.password !== ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 401);
      const leads = (await store.get('all', { type: 'json' })) || [];
      return json(leads);
    }

    // Public create: { lead: {...} }
    if (body.lead && body.lead.name && body.lead.phone) {
      const leads = (await store.get('all', { type: 'json' })) || [];
      leads.unshift(body.lead);
      await store.setJSON('all', leads);
      return json({ ok: true });
    }

    return json({ error: 'Invalid request' }, 400);
  }

  return json({ error: 'Method not allowed' }, 405);
};
