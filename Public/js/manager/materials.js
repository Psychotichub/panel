// Manager materials popup script extracted from HTML to external JS
(async function() {
  try {
    const params = new URLSearchParams(window.location.search);
    const site = params.get('site');
    const company = params.get('company');
    const meta = document.getElementById('meta');
    if (meta) meta.innerHTML = `Site: <strong>${site||''}</strong> &nbsp; | &nbsp; Company: <strong>${company||''}</strong>`;

    // Try to read token from opener if available
    let token = null;
    try { token = window.opener && window.opener.getToken ? window.opener.getToken() : null; } catch(_){ void 0; }
    if (!token) {
      try { token = localStorage.getItem('token') || sessionStorage.getItem('token'); } catch(_){ void 0; }
    }

    const resp = await fetch(`/api/manager/site/materials?site=${encodeURIComponent(site)}&company=${encodeURIComponent(company)}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        'X-Site': site || '',
        'X-Company': company || ''
      }
    });
    if (!resp.ok) {
      const txt = await resp.text();
      const statusEl = document.getElementById('status');
      if (statusEl) statusEl.textContent = `Failed to load materials: ${resp.status} - ${txt}`;
      return;
    }

    const data = await resp.json();
    const materials = Array.isArray(data) ? data : (data.materials || []);

    const statusEl = document.getElementById('status');
    const countEl = document.getElementById('count');
    const bodyEl = document.getElementById('materialsBody');
    const filterEl = document.getElementById('creatorFilter');
    if (statusEl) statusEl.textContent = '';

    const creators = Array.from(new Set(materials.map(m => m.createdBy).filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b)));
    if (filterEl) filterEl.innerHTML = ['<option value="__all__">All</option>', ...creators.map(c=>`<option value="${c}">${c}</option>`)].join('');

    const renderRows = (creator) => {
      const filtered = (creator && creator !== '__all__') ? materials.filter(m => m.createdBy === creator) : materials;
      if (countEl) countEl.textContent = `Total materials: ${filtered.length}`;
      if (!bodyEl) return;
      if (filtered.length === 0) {
        bodyEl.innerHTML = '<tr><td colspan="5">No materials found.</td></tr>';
        return;
      }
      bodyEl.innerHTML = filtered.map(m => `
        <tr>
          <td>${m.materialName || ''}</td>
          <td>${m.unit || ''}</td>
          <td>${Number(m.materialPrice || 0).toFixed(2)} €</td>
          <td>${Number(m.laborPrice || 0).toFixed(2)} €</td>
          <td>${m.createdBy || ''}</td>
        </tr>
      `).join('');
    };

    renderRows('__all__');
    if (filterEl) filterEl.addEventListener('change', () => renderRows(filterEl.value));
  } catch (e) {
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = 'Unexpected error.';
  }
})();

