const SELECTORS = {
  galleryView: '.notion-gallery-view',
  galleryItem: '.notion-collection-item',
  databaseContainer: '[data-block-id]',
  pageHeader: '.notion-page-content .notion-header-block [contenteditable="true"]',
  image: 'img:not(.notion-emoji):not([src*="/icons/"])'
};

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

    if (!gallery.querySelector(SELECTORS.galleryItem)) return;

    if (gallery.dataset.verticalGalleryProcessed) return;
    gallery.dataset.verticalGalleryProcessed = 'true';
    const databaseContainer = gallery.querySelector(SELECTORS.databaseContainer);
    if (!databaseContainer) return;
    const dbId = databaseContainer.dataset.blockId;
    const { [dbId]: isEnabled = false } = await chrome.storage.local.get(dbId);
    setVerticalMode(gallery, isEnabled);

    // If the toggle has been hidden by the user, then don't show the toggle for this DB
    const { hiddenToggles = {} } = await chrome.storage.local.get('hiddenToggles');
    if (hiddenToggles[dbId]) return;
    const hasImages = gallery.querySelector(SELECTORS.image);
    if (!hasImages) return;
    
    /* START - Add toggle to current */
    const label = document.createElement('label');
    label.className = 'vertical-mode-toggle';
    const verticalModeText = chrome.i18n.getMessage('verticalMode');
    label.innerHTML = `
        <span class="toggle-text">${verticalModeText}</span>
        <span class="switch">
          <input type="checkbox">
          <span class="slider"></span>
        </span>
    `;
    
    const hideButton = document.createElement('button');
    hideButton.className = 'hide-toggle-btn';
    hideButton.textContent = chrome.i18n.getMessage('hideToggleButton');
    hideButton.title = chrome.i18n.getMessage('hideToggleTitle');
    label.appendChild(hideButton);

    const input = label.querySelector('input');
    gallery.prepend(label);
    
    input.checked = isEnabled;

    // Listen for clicks on "Hide" button
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
  /* END - Add toggle */

  // Listen for toggle value changes
  input.addEventListener('change', (event) => {
    const enabled = event.target.checked;
    chrome.storage.local.set({ [dbId]: enabled });
    setVerticalMode(gallery, enabled);
  });
}

function findAndProcessGalleries() {
  const galleries = document.querySelectorAll(SELECTORS.galleryView);
  galleries.forEach(processGallery);
  // Restituisce il numero di gallerie trovate, ci servirà per la nuova logica
  return galleries.length;
}

// --- LOGICA DI ESECUZIONE ---

// 1. L'Observer gestisce i cambiamenti DOPO il caricamento iniziale (es. cambio pagina)
const observer = new MutationObserver(findAndProcessGalleries);
observer.observe(document.body, { childList: true, subtree: true });

// 2. Logica "paziente" per il caricamento iniziale della pagina
let attempts = 0;
const maxAttempts = 20; // Prova per 10 secondi (20 * 500ms)
const initialLoadChecker = setInterval(() => {
  attempts++;
  const galleriesFound = findAndProcessGalleries();
  
  // Se troviamo almeno una galleria OPPURE se abbiamo provato abbastanza volte,
  // smettiamo di controllare per non sprecare risorse.
  if (galleriesFound > 0 || attempts >= maxAttempts) {
    clearInterval(initialLoadChecker);
  }
}, 500);