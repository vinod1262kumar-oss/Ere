// functions/settings.js
// Small site-wide settings blob — right now just the homepage trust video.
// Public GET so the homepage can show it; POST requires the admin password.

import { getStore } from '@netlify/blobs';

const ADMIN_PASSWORD = 'Mishra ji';

function json(data, status = 200){
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

const DEFAULT_SETTINGS = { trustVideoUrl: '', trustVideoCaption: '' };

export default async (req) => {
  const store = getStore('mpd-settings');

  if (req.method === 'GET') {
    const settings = (await store.get('all', { type: 'json' })) || DEFAULT_SETTINGS;
    return json(settings);
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    if (body.password !== ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 401);

    const settings = {
      trustVideoUrl: (body.trustVideoUrl || '').trim(),
      trustVideoCaption: (body.trustVideoCaption || '').trim()
    };
    await store.setJSON('all', settings);
    return json(settings);
  }

  return json({ error: 'Method not allowed' }, 405);
};
