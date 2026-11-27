/**
 * Bhuvana's Bridal Studio — Additional Services Selection Controller
 * Renders categorized service checkboxes across both divisions,
 * synchronizes with BBS_STORE, updates the selection summary card, and handles Continue/Back.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async function () {
    await window.BBS_CATALOG?.ready;
    if (!window.BBS_STORE || !window.BBS_CATALOG) {
      console.error('Store or Catalog not loaded');
      return;
    }

    // Render Progress Bar (Step 2 of 5)
    window.BBS_STORE.renderProgressBar('progress-bar-container', 2);

    const catalog = window.BBS_CATALOG.services;
    const store = window.BBS_STORE;

    const summaryContainer = document.getElementById('selected-summary-list');
    const summaryCountEl = document.getElementById('selected-summary-count');
    const btnContinue = document.getElementById('btn-continue-req');
    const btnBack = document.getElementById('btn-back-prev');

    function escapeHtml(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    }

    // Renders the summary of selected services
    function renderSummary() {
      const selectedIds = store.getSelectedIds();
      if (summaryCountEl) {
        summaryCountEl.textContent = selectedIds.length;
      }

      if (!summaryContainer) return;

      if (selectedIds.length === 0) {
        summaryContainer.innerHTML = '<p style="color:var(--muted); font-size:0.9rem; padding:0.5rem 0;">No services currently selected. Please check at least one service below.</p>';
        return;
      }

      let html = '';
      selectedIds.forEach(function (id) {
        const srv = catalog[id];
        if (!srv) return;
        html += `
          <div class="selected-service-item">
            <div class="selected-service-info">
              <span class="selected-service-title">${escapeHtml(srv.title)}</span>
              <span class="selected-service-meta">${escapeHtml(srv.division)} &bull; ${escapeHtml(srv.category)}</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span class="selected-service-price">${escapeHtml(srv.pricingDisplay)}</span>
              <button class="btn-remove" type="button" data-remove-id="${escapeHtml(srv.id)}" title="Remove this service">Remove &times;</button>
            </div>
          </div>
        `;
      });

      summaryContainer.innerHTML = html;

      // Attach remove handlers
      summaryContainer.querySelectorAll('.btn-remove').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const idToRemove = this.getAttribute('data-remove-id');
          store.removeService(idToRemove);
          syncCheckboxes();
          renderSummary();
        });
      });
    }

    // Synchronizes the checkboxes on the page with the store
    function syncCheckboxes() {
      const selectedIds = store.getSelectedIds();
      document.querySelectorAll('input[type="checkbox"][data-service-id]').forEach(function (chk) {
        const id = chk.getAttribute('data-service-id');
        chk.checked = selectedIds.includes(id);
      });
    }

    // Delegate change handling so owner-added services work too.
    document.addEventListener('change', function (event) {
      const chk = event.target.closest('input[type="checkbox"][data-service-id]');
      if (!chk) return;
      const id = chk.getAttribute('data-service-id');
      if (chk.checked) store.addService(id);
      else store.removeService(id);
      renderSummary();
    });

    function syncLiveOptions() {
      document.querySelectorAll('input[type="checkbox"][data-service-id]').forEach(function(chk) {
        const srv = catalog[chk.dataset.serviceId];
        const label = chk.closest('label');
        if (!srv || !window.BBS_CATALOG.getById(chk.dataset.serviceId)) {
          if (label) label.hidden = true;
          store.removeService(chk.dataset.serviceId);
          return;
        }
        if (label) {
          label.hidden = false;
          const text = Array.from(label.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
          if (text) text.textContent = ' ' + srv.title;
        }
      });
      const custom = window.BBS_CATALOG.getAll().filter(s => s.__custom);
      let fieldset = document.getElementById('custom-live-services');
      if (!custom.length) { fieldset?.remove(); return; }
      if (!fieldset) {
        fieldset=document.createElement('fieldset'); fieldset.id='custom-live-services'; fieldset.className='checkbox-group';
        fieldset.style.marginBottom='1.5rem'; fieldset.innerHTML='<legend>Additional Studio Services</legend><div class="checkbox-options cols-3"></div>';
        document.querySelector('.action-btn-row')?.before(fieldset);
      }
      fieldset.querySelector('.checkbox-options').innerHTML=custom.map(s =>
        '<label class="checkbox-label"><input type="checkbox" data-service-id="'+s.id.replace(/[^a-z0-9-]/g,'')+'"> '+s.title.replace(/[&<>"']/g,'')+'</label>'
      ).join('');
      syncCheckboxes();
    }
    window.addEventListener('bbs:catalog-updated', function() {
      syncLiveOptions(); syncCheckboxes(); renderSummary();
    });
    syncLiveOptions();

    // Continue Button Handler
    if (btnContinue) {
      btnContinue.addEventListener('click', function () {
        const selected = store.getSelectedIds();
        if (selected.length === 0) {
          alert('Please select at least one service to continue.');
          return;
        }
        window.location.href = 'requirements.html';
      });
    }

    // Back Button Handler
    if (btnBack) {
      btnBack.addEventListener('click', function () {
        window.history.back();
      });
    }

    // Initial render
    syncCheckboxes();
    renderSummary();
  });

})();
