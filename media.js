// netlify/functions/media.js
// Uploads media selected from the phone gallery and serves it back as a public URL.
// Files are stored in Netlify Blobs. Chunked uploads let short phone videos be
// uploaded without putting the whole video into one request.

import { getStore } from '@netlify/blobs';

const ADMIN_PASSWORD = 'Mishra ji';
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function json(data, status = 200){
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function cleanId(value){
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function bytesFromBase64(value){
  const bin = Buffer.from(value || '', 'base64');
  return new Uint8Array(bin);
}

export default async (req) => {
  const store = getStore('mpd-media');

  if(req.method === 'GET'){
    const id = cleanId(new URL(req.url).searchParams.get('id'));
    if(!id) return new Response('Missing media id', { status: 400 });

    const blob = await store.get(id, { type: 'blob' });
    if(!blob) return new Response('Media not found', { status: 404 });

    const contentType = blob.type || 'application/octet-stream';
    return new Response(blob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }

  if(req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const body = await req.json().catch(() => ({}));
  if(body.password !== ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 401);

  const action = body.action || 'chunk';

  if(action === 'chunk'){
    const uploadId = cleanId(body.uploadId);
    const index = Number(body.index);
    const total = Number(body.total);
    const mime = String(body.mime || 'application/octet-stream');
    const kind = body.kind === 'video' ? 'video' : 'image';

    if(!uploadId || !Number.isInteger(index) || !Number.isInteger(total) || index < 0 || total < 1 || index >= total){
      return json({ error: 'Invalid upload chunk' }, 400);
    }

    const chunk = bytesFromBase64(body.data);
    const max = kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if(chunk.byteLength > 2 * 1024 * 1024) return json({ error: 'Chunk is too large' }, 413);

    const key = `chunks/${uploadId}/${index}`;
    await store.set(key, chunk, { metadata: { contentType: mime } });

    if(body.final !== true) return json({ ok: true, index });

    const parts = [];
    let totalBytes = 0;
    for(let i = 0; i < total; i++){
      const part = await store.get(`chunks/${uploadId}/${i}`, { type: 'arrayBuffer' });
      if(!part) return json({ error: `Missing chunk ${i}` }, 400);
      const bytes = new Uint8Array(part);
      totalBytes += bytes.byteLength;
      if(totalBytes > max) return json({ error: `${kind === 'video' ? 'Video' : 'Image'} is too large.` }, 413);
      parts.push(bytes);
    }

    const blob = new Blob(parts, { type: mime });
    const mediaId = `${kind}-${uploadId}`;
    await store.set(mediaId, blob, { metadata: { contentType: mime } });

    for(let i = 0; i < total; i++){
      try { await store.delete(`chunks/${uploadId}/${i}`); } catch(_) {}
    }

    return json({
      ok: true,
      id: mediaId,
      url: `/.netlify/functions/media?id=${encodeURIComponent(mediaId)}`,
      mime,
      size: totalBytes
    });
  }

  return json({ error: 'Unknown action' }, 400);
};
