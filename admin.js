/* ============================================================
   Mishra Property Dealer — Admin dashboard logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const loginView = document.getElementById('loginView');
  const dashboardView = document.getElementById('dashboardView');

  async function enterDashboard(){
    loginView.style.display = 'none';
    dashboardView.hidden = false;
    initRipple();
    await refreshAll();
  }

  async function refreshAll(){
    // Run together — each panel renders as soon as its own data arrives.
    await Promise.all([renderStats(), renderInventory(), renderLeads(), renderAnalytics(), loadVideoSettings()]);
  }

  if(Store.isAdmin()) enterDashboard();

  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const pw = document.getElementById('loginPassword').value;
    if(Store.login(pw)){
      enterDashboard();
    }else{
      document.getElementById('loginMessage').textContent = "That password isn't right — try again.";
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    Store.logout();
    location.reload();
  });

  // Phone gallery image picker + client-side optimization.
  const photoInput = document.querySelector('input[name="photos"]');
  const photoPreview = document.getElementById('photoPreview');
  const videoInput = document.getElementById('trustVideoFile');
  const videoPreview = document.getElementById('videoPreview');

  function optimizeImage(file, maxSide=1400, quality=0.78){
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          URL.revokeObjectURL(url);
          if(blob) resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {type:'image/webp'}));
          else reject(new Error('Could not optimize image.'));
        }, 'image/webp', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image.')); };
      img.src = url;
    });
  }

  photoInput.addEventListener('change', () => {
    const files = Array.from(photoInput.files || []).slice(0, 8);
    photoInput._selectedFiles = files;
    photoPreview.innerHTML = '';
    if(!files.length){
      photoPreview.style.display = 'none';
      return;
    }
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      const img = document.createElement('img');
      img.src = url;
      img.alt = file.name;
      img.onload = () => URL.revokeObjectURL(url);
      photoPreview.appendChild(img);
    });
    photoPreview.style.display = 'grid';
  });

  // Android document providers can revoke a temporary gallery-file reference after
  // the picker closes. Read the selected video immediately and keep an in-memory
  // copy instead of depending on the original File handle later. Also avoid a
  // blob-URL preview, which can trigger the same permission error on some phones.
  videoInput.addEventListener('change', async () => {
    const picked = videoInput.files && videoInput.files[0];
    videoPreview.innerHTML = '';
    videoInput._selectedVideoFile = null;
    if(!picked){
      videoPreview.style.display = 'none';
      return;
    }

    const msg = document.getElementById('videoMessage');
    const maxBytes = 50 * 1024 * 1024;
    if(picked.size > maxBytes){
      msg.textContent = 'Video is too large. Please choose a video under 50 MB.';
      videoPreview.style.display = 'none';
      return;
    }

    msg.textContent = 'Reading the selected video…';
    try{
      // Copy the bytes while Android still has the picker permission.
      const buffer = await picked.arrayBuffer();
      const stable = new File([buffer], picked.name || ('video-' + Date.now() + '.mp4'), {
        type: picked.type || 'video/mp4',
        lastModified: Date.now()
      });
      videoInput._selectedVideoFile = stable;

      const info = document.createElement('p');
      info.textContent = `Selected: ${stable.name} (${(stable.size / 1024 / 1024).toFixed(1)} MB)`;
      info.style.margin = '0';
      info.style.fontSize = '0.86rem';
      videoPreview.appendChild(info);
      videoPreview.style.display = 'block';
      msg.textContent = 'Video ready to upload.';
    }catch(err){
      console.error('Gallery video read failed:', err);
      msg.textContent = 'Your phone did not grant access to this video. Try selecting it again from Gallery, or move/copy the video to Downloads and select it there.';
      videoPreview.style.display = 'none';
    }
  });

  document.getElementById('propertyForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const msg = document.getElementById('propertyMessage');
    submitBtn.disabled = true;
    msg.textContent = 'Preparing photos…';

    try{
      const selected = Array.from(photoInput._selectedFiles || []).slice(0, 8);
      if(!selected.length) throw new Error('Please choose at least one property photo from your Gallery.');

      const photos = [];
      for(let i = 0; i < selected.length; i++){
        msg.textContent = `Uploading photo ${i + 1} of ${selected.length}…`;
        const optimized = await optimizeImage(selected[i]);
        const uploaded = await Store.uploadMedia(optimized, 'image');
        photos.push(uploaded.url);
      }

      msg.textContent = 'Saving property…';
      await Store.addListing({
        id: genId(),
        title: form.title.value.trim(),
        type: form.type.value,
        status: form.status.value,
        price: Number(form.price.value) || 0,
        area: Number(form.area.value) || 0,
        bedrooms: Number(form.bedrooms.value) || 0,
        bathrooms: Number(form.bathrooms.value) || 0,
        location: form.location.value.trim(),
        description: form.description.value.trim(),
        overview: form.overview.value.trim(),
        photos,
        photo: photos[0],
        stockPhoto: '',
        featured: form.featured.checked,
        createdAt: Date.now()
      });

      form.reset();
      photoInput._selectedFiles = [];
      photoPreview.innerHTML = '';
      photoPreview.style.display = 'none';
      msg.textContent = 'Property added.';
      showToast('Property + photos added.');
      await Promise.all([renderStats(), renderInventory()]);
    }catch(err){
      msg.textContent = err.message || 'Could not save the listing — try again.';
    }finally{
      submitBtn.disabled = false;
    }
  });

  document.getElementById('videoForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const file = videoInput._selectedVideoFile || (videoInput.files && videoInput.files[0]);
    const submitBtn = form.querySelector('button[type="submit"]');
    const msg = document.getElementById('videoMessage');

    if(!file){
      msg.textContent = 'Choose a video from your Gallery first.';
      return;
    }

    submitBtn.disabled = true;
    msg.textContent = 'Uploading video… keep this page open.';
    try{
      const uploaded = await Store.uploadMedia(file, 'video');
      await Store.updateSettings({
        trustVideoUrl: uploaded.url,
        trustVideoCaption: form.trustVideoCaption.value.trim()
      });
      msg.textContent = 'Video uploaded and saved.';
      showToast('Homepage video updated.');
    }catch(err){
      msg.textContent = err.message || 'Could not upload video — try a shorter video.';
    }finally{
      submitBtn.disabled = false;
    }
  });

  async function loadVideoSettings(){
    const form = document.getElementById('videoForm');
    try{
      const settings = await Store.getSettings();
      form.trustVideoCaption.value = settings.trustVideoCaption || '';
    }catch(e){
      console.warn('Could not load current video settings:', e);
    }
  }

  async function renderStats(){
    const statsEl = document.getElementById('stats');
    const [visits, leads, listings] = await Promise.all([
      Store.getVisits(), Store.getLeads(), Store.getListings()
    ]);
    const conversion = visits.length ? Math.round((leads.length / visits.length) * 100) : 0;

    statsEl.innerHTML = `
      <div class="glass stat"><span>Total page views</span><strong>${visits.length}</strong></div>
      <div class="glass stat"><span>Enquiries received</span><strong>${leads.length}</strong></div>
      <div class="glass stat"><span>Active listings</span><strong>${listings.length}</strong></div>
      <div class="glass stat"><span>Visit-to-enquiry rate</span><strong>${conversion}%</strong></div>
    `;
  }

  async function renderInventory(){
    const el = document.getElementById('propertiesAdmin');
    el.innerHTML = '<p class="empty-state">Loading…</p>';
    const listings = await Store.getListings();

    el.innerHTML = listings.map(l => `
      <div class="inventory-row">
        <div class="inventory-thumb" style="background-image:url('${listingImage(l)}')"></div>
        <div class="inventory-meta">
          <strong>${escapeHtml(l.title)}</strong>
          <span>${escapeHtml(l.location)} · ${formatPrice(l.price, l.status)} · ${l.status}</span>
        </div>
        <button class="glass-btn small-btn" data-remove="${l.id}" style="color:#a8412f; border-color:rgba(176,72,60,0.4);">Remove</button>
      </div>
    `).join('') || '<p class="empty-state">No properties yet — add your first one.</p>';

    el.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Removing…';
        try{
          await Store.removeListing(btn.dataset.remove);
          showToast('Listing removed.');
          await Promise.all([renderInventory(), renderStats()]);
        }catch(err){
          showToast(err.message || 'Could not remove the listing.');
          btn.disabled = false;
          btn.textContent = 'Remove';
        }
      });
    });
  }

  async function renderLeads(){
    const el = document.getElementById('leads');
    el.innerHTML = '<p class="empty-state">Loading…</p>';
    const leads = await Store.getLeads();

    if(!leads.length){
      el.innerHTML = '<p class="empty-state">No enquiries yet — they will appear here as visitors send them.</p>';
      return;
    }
    el.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Interested in</th><th>Message</th><th>Received</th></tr></thead>
        <tbody>
          ${leads.map(l => `
            <tr>
              <td>${escapeHtml(l.name)}</td>
              <td>${escapeHtml(l.phone)}</td>
              <td>${escapeHtml(l.listingTitle)}</td>
              <td>${escapeHtml(l.message) || '—'}</td>
              <td>${new Date(l.at).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  async function renderAnalytics(){
    const el = document.getElementById('analytics');
    el.innerHTML = '<p class="empty-state">Loading…</p>';
    const visits = await Store.getVisits();

    if(!visits.length){
      el.innerHTML = '<p class="empty-state">No page views recorded yet.</p>';
      return;
    }
    const counts = {};
    visits.forEach(v => { counts[v.page] = (counts[v.page] || 0) + 1; });
    const entries = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    const max = entries[0][1];

    el.innerHTML = entries.map(([page, count]) => `
      <div style="margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; font-size:0.86rem; margin-bottom:6px;">
          <span style="color:var(--text-dim);">${page}</span>
          <span style="color:var(--gold);">${count}</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${(count/max)*100}%"></div></div>
      </div>
    `).join('');
  }
});
