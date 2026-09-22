// netlify/functions/listings.js
// Property listings, stored in Netlify Blobs so they're shared across every
// visitor and device instead of living in one browser's localStorage.

import { getStore } from '@netlify/blobs';

const ADMIN_PASSWORD = 'Mishra ji';

const STOCK_PHOTOS = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
];

const SEED_LISTINGS = [
  {
    id: 'lst_001',
    title: '3BHK Residential Flat, Ramnagar',
    type: 'Residential',
    status: 'For Sale',
    price: 7800000,
    location: 'Ramnagar, Varanasi',
    area: 1550,
    bedrooms: 3,
    bathrooms: 2,
    description: 'A well-ventilated third-floor flat close to Ramnagar Fort Road, with covered parking and a small balcony facing the Ganga side of town. Ready to move in.',
    overview: 'This residence sits a short walk from Ramnagar Fort Road, in a quiet, established pocket of the neighbourhood. The layout favours cross-ventilation, and the building has covered parking for two vehicles. A compact balcony off the living room looks out toward the riverside end of Ramnagar — ideal for a family that wants easy access to central Varanasi without the noise of it.',
    photo: '', stockPhoto: STOCK_PHOTOS[0],
    featured: true,
    createdAt: Date.now() - 86400000 * 12
  },
  {
    id: 'lst_002',
    title: 'Corner Plot, Ramnagar Fort Road',
    type: 'Plot',
    status: 'For Sale',
    price: 3600000,
    location: 'Ramnagar Fort Road, Varanasi',
    area: 1800,
    bedrooms: 0,
    bathrooms: 0,
    description: 'East-facing corner plot with a clear title and a boundary wall already in place, well suited to a bungalow or a small residential build.',
    overview: 'A rare corner plot on Ramnagar Fort Road with an east-facing entrance, considered auspicious by most buyers in the area. The boundary wall and basic levelling are already done, so a new owner can start construction without preliminary site work. Municipal water and electricity connections are available at the road.',
    photo: '', stockPhoto: STOCK_PHOTOS[1],
    featured: true,
    createdAt: Date.now() - 86400000 * 8
  },
  {
    id: 'lst_003',
    title: 'Shop Space, Ramnagar Market',
    type: 'Commercial',
    status: 'For Rent',
    price: 22000,
    location: 'Ramnagar Market, Varanasi',
    area: 300,
    bedrooms: 0,
    bathrooms: 1,
    description: 'Ground-floor shop on a high-footfall lane near Ramnagar Market, previously run as a general store, with a shutter frontage and a small storage loft.',
    overview: 'Positioned directly on a busy market lane in Ramnagar, this shop sees steady foot traffic through the day. The unit includes a shutter frontage, a small storage mezzanine, and a shared washroom on the same floor. Suitable for retail, a small showroom, or a service counter.',
    photo: '', stockPhoto: STOCK_PHOTOS[2],
    featured: true,
    createdAt: Date.now() - 86400000 * 3
  },
  {
    id: 'lst_004',
    title: '2BHK Apartment, Nadesar',
    type: 'Residential',
    status: 'For Rent',
    price: 14000,
    location: 'Nadesar, Varanasi',
    area: 950,
    bedrooms: 2,
    bathrooms: 2,
    description: 'Second-floor apartment near the Nadesar main road, freshly painted with modular kitchen fittings already in place.',
    overview: 'A tidy second-floor apartment a few minutes from the Nadesar main road, recently repainted with a modular kitchen already fitted. Good for a small family or a working professional who wants easy access to both the cantonment side of Varanasi and the older city.',
    photo: '', stockPhoto: STOCK_PHOTOS[3],
    featured: false,
    createdAt: Date.now() - 86400000 * 20
  }
];

function json(data, status = 200){
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export default async (req) => {
  const store = getStore('mpd-listings');

  if (req.method === 'GET') {
    let listings = await store.get('all', { type: 'json' });
    if (!listings) {
      listings = SEED_LISTINGS;
      await store.setJSON('all', listings);
    }
    return json(listings);
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    if (body.password !== ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 401);
    if (!body.listing || !body.listing.id) return json({ error: 'Missing listing' }, 400);

    let listings = await store.get('all', { type: 'json' });
    if (!listings) listings = SEED_LISTINGS;
    listings.unshift(body.listing);
    await store.setJSON('all', listings);
    return json(listings);
  }

  if (req.method === 'DELETE') {
    const body = await req.json().catch(() => ({}));
    if (body.password !== ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 401);

    let listings = await store.get('all', { type: 'json' });
    if (!listings) listings = SEED_LISTINGS;
    listings = listings.filter(l => l.id !== body.id);
    await store.setJSON('all', listings);
    return json(listings);
  }

  return json({ error: 'Method not allowed' }, 405);
};
