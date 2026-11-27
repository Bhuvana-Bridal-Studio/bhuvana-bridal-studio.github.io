(function () {
  'use strict';

  const taxonomy = {
    'bridal-beauty': [
      ['baby-shower', 'Baby Shower Makeup'], ['puberty-makeup', 'Puberty Makeup'], ['wedding-makeup', 'Wedding Makeup'], ['party-makeup', 'Party Makeup'],
      ['engagement-makeup', 'Engagement Makeup'], ['reception-makeup', 'Reception Makeup'], ['bridal-hairstyling', 'Bridal Hairstyling'], ['other-bridal', 'Other Bridal Work']
    ],
    'designer-blouse': [
      ['bridal-blouse', 'Bridal Blouse Designs'], ['aari-work', 'Aari Work']
    ]
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  document.querySelectorAll('[data-gallery-division]').forEach(async root => {
    const division = root.dataset.galleryDivision;
    const categories = taxonomy[division] || [];
    try {
      const result = await window.BBS_CONFIG.apiFetch(`/api/gallery?category=${encodeURIComponent(division)}`);
      const photos = (result.photos || []).filter(photo => photo.category === division);
      root.innerHTML = categories.map(([subcategory, label], index) => {
        const items = photos.filter(photo => photo.subcategory === subcategory).sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
        if (!items.length) return '';
        return `<section class="gallery-category-section" id="gallery-${escapeHtml(subcategory)}" aria-labelledby="gallery-title-${index + 1}">
          <div class="gallery-category-heading"><h2 id="gallery-title-${index + 1}">${escapeHtml(label)}</h2></div>
          <div class="gallery-grid">${items.map((photo, photoIndex) => {
            const caption = String(photo.title || label).trim();
            return `<button type="button" class="gallery-photo-button" data-gallery-photo="${escapeHtml(photo.id || `${subcategory}-${photoIndex}`)}" data-gallery-caption="${escapeHtml(caption)}" aria-label="View ${escapeHtml(caption)}"><img class="gallery-item-img" src="${escapeHtml(photo.image_url)}" alt="${escapeHtml(caption)}" loading="lazy"><span class="gallery-caption">${escapeHtml(caption)}</span></button>`;
          }).join('')}</div>
        </section>`;
      }).join('');

      let dialog = document.getElementById('gallery-photo-dialog');
      if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'gallery-photo-dialog';
        dialog.className = 'gallery-photo-dialog';
        dialog.innerHTML = '<button type="button" class="gallery-photo-close" aria-label="Close photo">&times;</button><figure><img alt=""><figcaption></figcaption></figure>';
        document.body.appendChild(dialog);
        dialog.querySelector('.gallery-photo-close').addEventListener('click', () => dialog.close());
        dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
      }
      root.querySelectorAll('[data-gallery-photo]').forEach(button => button.addEventListener('click', () => {
        const image = button.querySelector('img');
        dialog.querySelector('figure img').src = image.src;
        dialog.querySelector('figure img').alt = image.alt;
        dialog.querySelector('figcaption').textContent = button.dataset.galleryCaption || image.alt;
        dialog.showModal();
      }));
    } catch {
      root.innerHTML = '<p class="gallery-empty">Gallery photos are temporarily unavailable.</p>';
    }
  });
})();
