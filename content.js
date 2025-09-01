// content.js

function applyUserSettings() {
  chrome.storage.local.get({ galleryHeight: '280' }, function(items) {
    document.documentElement.style.setProperty('--vertical-gallery-height', items.galleryHeight + 'px');
  });
}
applyUserSettings();

function setVerticalMode(galleryElement, isEnabled) {
  galleryElement.classList.toggle('vertical-mode-enabled', isEnabled);
}

async function processGallery(gallery) {
  // --- NUOVO CONTROLLO DI TEMPISTICA ---
  // Se la galleria non contiene ancora le "card", è troppo presto.
  // La funzione uscirà e riproverà al prossimo aggiornamento del DOM.
  if (!gallery.querySelector('.notion-collection-item')) {
    return;
  }

  // Se siamo qui, le card sono caricate. Ora possiamo procedere.
  if (gallery.dataset.verticalGalleryProcessed) return;
  gallery.dataset.verticalGalleryProcessed = 'true';
  
  const databaseContainer = gallery.querySelector('[data-block-id]');
  if (!databaseContainer) return;
  const dbId = databaseContainer.dataset.blockId;

  // 1. Applica sempre lo stile
  const { [dbId]: isEnabled = false } = await chrome.storage.local.get(dbId);
  setVerticalMode(gallery, isEnabled);

  // 2. Decide se mostrare l'interfaccia
  const { hiddenToggles = {} } = await chrome.storage.local.get('hiddenToggles');
  if (hiddenToggles[dbId]) {
    return;
  }

  // 3. Crea l'interfaccia
  const hasImages = gallery.querySelector('.notion-collection-item img:not(.notion-emoji):not([src*="/icons/"])');
  if (!hasImages) return;

  const label = document.createElement('label');
  label.className = 'vertical-mode-toggle';
  label.innerHTML = `
    <span class="toggle-text">Vertical Mode</span>
    <span class="switch">
      <input type="checkbox">
      <span class="slider"></span>
    </span>
  `;
  
  const hideButton = document.createElement('button');
  hideButton.className = 'hide-toggle-btn';
  hideButton.textContent = '❌ Hide toggle saving current state';
  hideButton.title = 'Hide toggle. You can restore its visibility from the extension settings.';
  label.appendChild(hideButton);

  const input = label.querySelector('input');
  gallery.prepend(label);
  
  input.checked = isEnabled;

  hideButton.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const header = gallery.closest('.notion-page-content')?.querySelector('.notion-header-block [contenteditable="true"]');
    const dbTitle = header ? header.textContent : `Database ID: (${dbId.substring(0, 6)}...)`;
    const { hiddenToggles = {} } = await chrome.storage.local.get('hiddenToggles');
    hiddenToggles[dbId] = dbTitle;
    await chrome.storage.local.set({ hiddenToggles });
    label.style.display = 'none';
  });

  input.addEventListener('change', (event) => {
    const enabled = event.target.checked;
    chrome.storage.local.set({ [dbId]: enabled });
    setVerticalMode(gallery, enabled);
  });
}

function findAndProcessGalleries() {
  document.querySelectorAll('.notion-gallery-view').forEach(processGallery);
}

const observer = new MutationObserver(() => findAndProcessGalleries());
observer.observe(document.body, { childList: true, subtree: true });
findAndProcessGalleries();