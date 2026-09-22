/* ============================================================
   Mishra Property Dealer — Shared UI behaviour
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  injectFloatingContact();
  initRipple();
  markActiveNav();
  trackVisit();
});

function injectFloatingContact(){
  if(document.body.classList.contains('admin-body')) return;
  if(document.getElementById('floatingContact')) return;

  const hasRealNumber = /^\d{10,15}$/.test(DEALER_CONTACT.phoneTel);
  const wa = hasRealNumber
    ? `https://wa.me/${DEALER_CONTACT.phoneTel}?text=${encodeURIComponent(DEALER_CONTACT.whatsappPrefill)}`
    : `https://wa.me/?text=${encodeURIComponent(DEALER_CONTACT.whatsappPrefill)}`;
  const tel = hasRealNumber ? `tel:+${DEALER_CONTACT.phoneTel}` : 'contact.html';

  const wrap = document.createElement('div');
  wrap.className = 'floating-contact';
  wrap.id = 'floatingContact';
  wrap.innerHTML = `
    <a class="glass-btn btn-whatsapp" href="${wa}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.87 9.87 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.12c-.24.68-1.4 1.32-1.93 1.4-.49.08-1.11.11-1.79-.11-.41-.13-.94-.31-1.62-.6-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94s.73-2.08 1-2.36c.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2 .9 2.15.07.15.12.32.02.51-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.72 1.19 1.55 1.93 1.07.95 1.97 1.25 2.25 1.39.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.18-.27.36-.22.6-.13.24.09 1.55.73 1.82.86.27.14.44.2.51.31.07.11.07.63-.17 1.3z"/></svg>
      WhatsApp
    </a>
    <a class="glass-btn primary-btn" href="${tel}" aria-label="Call Mishra ji">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      Call
    </a>
  `;
  document.body.appendChild(wrap);
}

function initMobileNav(){
  const menuBtn = document.getElementById('menuBtn');
  const navMenu = document.getElementById('navMenu');
  if(!menuBtn || !navMenu) return;
  menuBtn.addEventListener('click', () => {
    navMenu.classList.toggle('show');
    menuBtn.textContent = navMenu.classList.contains('show') ? '✕' : '☰';
  });
  navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    navMenu.classList.remove('show');
    menuBtn.textContent = '☰';
  }));
}

function initRipple(){
  document.querySelectorAll('.glass-btn').forEach(button => {
    button.addEventListener('click', function(event){
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });
}

function markActiveNav(){
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#navMenu a').forEach(a => {
    if(a.getAttribute('href') === path) a.classList.add('active');
  });
}

function trackVisit(){
  const page = location.pathname.split('/').pop() || 'index.html';
  Store.logVisit(page);
}

function showToast(msg){
  let toast = document.querySelector('.toast');
  if(!toast){
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2600);
}

function renderCard(listing){
  const bedBath = listing.bedrooms
    ? `${listing.bedrooms} Beds • ${listing.bathrooms} Baths • ${listing.area} sq.ft.`
    : (listing.type === 'Plot' ? `Plot • ${listing.area} sq.ft.` : `${listing.type} • ${listing.area} sq.ft.`);
  const alt = escapeHtml(`${listing.title} — ${listing.type} ${listing.status} in ${listing.location}`);
  return `
    <article class="property-card">
      <div class="property-image">
        <img src="${listingImage(listing)}" alt="${alt}" loading="lazy" decoding="async" width="400" height="220">
        <span class="badge">${listing.status}</span>
      </div>
      <div class="property-info">
        <span>${listing.type}</span>
        <h3>${escapeHtml(listing.title)}</h3>
        <p>${bedBath}</p>
        <a href="property-details.html?id=${encodeURIComponent(listing.id)}" class="small-btn glass-btn">View Details →</a>
      </div>
    </article>
  `;
}

function renderPropertyGrid(containerId, listings){
  const grid = document.getElementById(containerId);
  if(!grid) return;
  grid.innerHTML = listings.length
    ? listings.map(renderCard).join('')
    : '<p class="empty-state">No properties are currently available.</p>';
}

// Accepts a YouTube link, a Vimeo link, or a direct video file link (mp4/webm/mov)
// and returns ready-to-insert HTML for a responsive embed. Empty/unrecognized
// input returns ''.
function buildVideoEmbedHtml(url, title){
  if(!url) return '';
  const safeTitle = escapeHtml(title || 'Introduction video');

  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if(yt){
    return `<div class="video-frame"><iframe src="https://www.youtube.com/embed/${yt[1]}" title="${safeTitle}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  }

  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if(vimeo){
    return `<div class="video-frame"><iframe src="https://player.vimeo.com/video/${vimeo[1]}" title="${safeTitle}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  }

  // Media uploaded from the Admin Gallery is served by our Netlify media function.
  if(/\/\.netlify\/functions\/media\?id=video-/i.test(url) || /\.(mp4|webm|mov)(\?.*)?$/i.test(url)){
    return `<div class="video-frame"><video src="${url}" controls playsinline preload="metadata"></video></div>`;
  }

  // Unrecognized format — still give visitors a way to watch it.
  return `<p><a href="${url}" target="_blank" rel="noopener" class="glass-btn small-btn">Watch the video →</a></p>`;
}
