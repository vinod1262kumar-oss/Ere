// netlify/functions/visits.js
// Page-view log for the admin analytics tab. Anyone's page load can add a
// row (that's how analytics works); only the admin password can read it back.

import { getStore } from '@netlify/blobs';

const ADMIN_PASSWORD = 'Mishra ji';
const MAX_VISITS = 5000; // keep the blob from growing unbounded forever

function json(data, status = 200){
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export default async (req) => {
  const store = getStore('mpd-visits');

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));

    // Admin listing request: { action: 'list', password }
    if (body.action === 'list') {
      if (body.password !== ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 401);
      const visits = (await store.get('all', { type: 'json' })) || [];
      return json(visits);
    }

    // Public log: { page }
    if (body.page) {
      let visits = (await store.get('all', { type: 'json' })) || [];
      visits.push({ page: body.page, at: Date.now() });
      if (visits.length > MAX_VISITS) visits = visits.slice(visits.length - MAX_VISITS);
      await store.setJSON('all', visits);
      return json({ ok: true });
    }

    return json({ error: 'Invalid request' }, 400);
  }

  return json({ error: 'Method not allowed' }, 405);
};
