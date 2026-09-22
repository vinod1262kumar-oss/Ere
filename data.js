/* ============================================================
   Mishra Property Dealer — Data layer (Ramnagar, Varanasi)
   Listings / leads / visits now live server-side in Netlify Blobs,
   reached through the functions in netlify/functions/. This file is
   the client's only touchpoint with storage — nothing else should
   call fetch('/.netlify/functions/...') directly.
   ============================================================ */

const API = {
  listings: '/.netlify/functions/listings',
  leads: '/.netlify/functions/leads',
  visits: '/.netlify/functions/visits',
  settings: '/.netlify/functions/settings'
};

const ADMIN_PASSWORD = 'Mishra ji'; // client-side hint only — every protected
                                     // request is re-checked against this same
                                     // value on the server in netlify/functions/.

const SESSION_KEY = 'mpd_admin_auth';

// Single place to set the real contact number before going live.
// phoneTel must be digits only (with country code, no spaces/plus) for tel:/wa.me links.
const DEALER_CONTACT = {
  phoneDisplay: '+91 94156 84748',
  phoneDisplayAlt: '+91 88879 99972',
  phoneTel: '919415684748',   // used for the Call/WhatsApp buttons
  phoneTelAlt: '918887999972',
  whatsappPrefill: "Hello Mishra ji, I'm interested in a property."
};

const STOCK_PHOTOS = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
];

// Used only if the Netlify Function can't be reached (e.g. functions not
// deployed yet) — keeps the site showing something real instead of nothing.
const FALLBACK_LISTINGS = [
  {
    id: 'lst_001', title: '3BHK Residential Flat, Ramnagar', type: 'Residential', status: 'For Sale',
    price: 7800000, location: 'Ramnagar, Varanasi', area: 1550, bedrooms: 3, bathrooms: 2,
    description: 'A well-ventilated third-floor flat close to Ramnagar Fort Road, with covered parking and a small balcony facing the Ganga side of town. Ready to move in.',
    overview: 'This residence sits a short walk from Ramnagar Fort Road, in a quiet, established pocket of the neighbourhood.',
    photo: '', stockPhoto: STOCK_PHOTOS[0], featured: true, createdAt: Date.now() - 86400000 * 12
  },
  {
    id: 'lst_002', title: 'Corner Plot, Ramnagar Fort Road', type: 'Plot', status: 'For Sale',
    price: 3600000, location: 'Ramnagar Fort Road, Varanasi', area: 1800, bedrooms: 0, bathrooms: 0,
    description: 'East-facing corner plot with a clear title and a boundary wall already in place.',
    overview: 'A rare corner plot on Ramnagar Fort Road with an east-facing entrance.',
    photo: '', stockPhoto: STOCK_PHOTOS[1], featured: true, createdAt: Date.now() - 86400000 * 8
  },
  {
    id: 'lst_003', title: 'Shop Space, Ramnagar Market', type: 'Commercial', status: 'For Rent',
    price: 22000, location: 'Ramnagar Market, Varanasi', area: 300, bedrooms: 0, bathrooms: 1,
    description: 'Ground-floor shop on a high-footfall lane near Ramnagar Market.',
    overview: 'Positioned directly on a busy market lane in Ramnagar, this shop sees steady foot traffic through the day.',
    photo: '', stockPhoto: STOCK_PHOTOS[2], featured: true, createdAt: Date.now() - 86400000 * 3
  },
  {
    id: 'lst_004', title: '2BHK Apartment, Nadesar', type: 'Residential', status: 'For Rent',
    price: 14000, location: 'Nadesar, Varanasi', area: 950, bedrooms: 2, bathrooms: 2,
    description: 'Second-floor apartment near the Nadesar main road, freshly painted.',
    overview: 'A tidy second-floor apartment a few minutes from the Nadesar main road.',
    photo: '', stockPhoto: STOCK_PHOTOS[3], featured: false, createdAt: Date.now() - 86400000 * 20
  }
];

const Store = {
  async uploadMedia(file, kind='image'){
    if(!file) throw new Error('Please choose a file first.');
    const maxBytes = kind === 'video' ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
    if(file.size > maxBytes){
      throw new Error(kind === 'video'
        ? 'Video is too large. Please choose a video under 50 MB.'
        : 'Image is too large. Please choose an image under 8 MB.');
    }

    const uploadId = (crypto.randomUUID ? crypto.randomUUID() : ('u_' + Date.now() + '_' + Math.random().toString(36).slice(2)));
    const chunkSize = 1024 * 1024;
    const total = Math.ceil(file.size / chunkSize);
    for(let index = 0; index < total; index++){
      const blob = file.slice(index * chunkSize, Math.min(file.size, (index + 1) * chunkSize));
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const step = 0x8000;
      for(let i = 0; i < bytes.length; i += step){
        binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + step, bytes.length)));
      }
      const data = btoa(binary);

      const res = await fetch('/.netlify/functions/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: this.adminPassword(),
          action: 'chunk',
          uploadId,
          index,
          total,
          mime: file.type || 'application/octet-stream',
          kind,
          data,
          final: index === total - 1
        })
      });
      if(!res.ok){
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Media upload failed.');
      }
      if(index === total - 1) return res.json();
    }
  },

  async getListings(){
    try{
      const res = await fetch(API.listings);
      if(!res.ok) throw new Error('bad response');
      return await res.json();
    }catch(e){
      console.warn('Listings API unreachable, showing local fallback data:', e);
      return FALLBACK_LISTINGS;
    }
  },

  async getListing(id){
    const listings = await this.getListings();
    return listings.find(l => l.id === id) || null;
  },

  async addListing(listing){
    const res = await fetch(API.listings, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: this.adminPassword(), listing })
    });
    if(!res.ok) throw new Error('Could not save the listing — check your connection and try again.');
    return res.json();
  },

  async removeListing(id){
    const res = await fetch(API.listings, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: this.adminPassword(), id })
    });
    if(!res.ok) throw new Error('Could not remove the listing — check your connection and try again.');
    return res.json();
  },

  async addLead(lead){
    const res = await fetch(API.leads, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead })
    });
    if(!res.ok) throw new Error('Could not send the enquiry — check your connection and try again.');
    return res.json();
  },

  async getLeads(){
    try{
      const res = await fetch(API.leads, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', password: this.adminPassword() })
      });
      if(!res.ok) throw new Error('bad response');
      return await res.json();
    }catch(e){
      console.warn('Leads API unreachable:', e);
      return [];
    }
  },

  logVisit(page){
    // Fire-and-forget — a slow/failed analytics ping should never block the page.
    fetch(API.visits, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page })
    }).catch(() => {});
  },

  async getVisits(){
    try{
      const res = await fetch(API.visits, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', password: this.adminPassword() })
      });
      if(!res.ok) throw new Error('bad response');
      return await res.json();
    }catch(e){
      console.warn('Visits API unreachable:', e);
      return [];
    }
  },

  async getSettings(){
    try{
      const res = await fetch(API.settings);
      if(!res.ok) throw new Error('bad response');
      return await res.json();
    }catch(e){
      console.warn('Settings API unreachable:', e);
      return { trustVideoUrl: '', trustVideoCaption: '' };
    }
  },

  async updateSettings(settings){
    const res = await fetch(API.settings, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: this.adminPassword(), ...settings })
    });
    if(!res.ok) throw new Error('Could not save settings — check your connection and try again.');
    return res.json();
  },

  isAdmin(){ return !!sessionStorage.getItem(SESSION_KEY); },
  adminPassword(){ return sessionStorage.getItem(SESSION_KEY) || ''; },
  login(pw){
    if(pw === ADMIN_PASSWORD){
      sessionStorage.setItem(SESSION_KEY, pw);
      return true;
    }
    return false;
  },
  logout(){ sessionStorage.removeItem(SESSION_KEY); }
};

function listingImage(listing){
  return (Array.isArray(listing.photos) && listing.photos[0]) || listing.photo || listing.stockPhoto || STOCK_PHOTOS[0];
}

function formatPrice(n, status){
  const isRent = status === 'For Rent';
  if(n >= 10000000) return '₹' + (n/10000000).toFixed(2).replace(/\.00$/,'') + ' Cr' + (isRent ? '/mo' : '');
  if(n >= 100000) return '₹' + (n/100000).toFixed(2).replace(/\.00$/,'') + ' L' + (isRent ? '/mo' : '');
  return '₹' + n.toLocaleString('en-IN') + (isRent ? '/mo' : '');
}

function genId(){
  return 'lst_' + Math.random().toString(36).slice(2, 9);
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
