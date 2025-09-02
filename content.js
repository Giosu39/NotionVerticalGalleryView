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

function customLog(message, color, objectToLog) {
  const enableLog = false; // For debugging purpose
  if (enableLog) {
    
    if (objectToLog) {
      console.log(message, `color: ${color};`, objectToLog)
    } else {
      console.log(message, `color: ${color};`)
    }
  }
}

async function processGallery(gallery) {
    customLog('%c[Vertical Gallery Debug] Processing gallery:', '#007acc', gallery);

    if (!gallery.querySelector(SELECTORS.galleryItem)) {
        customLog('%c[Vertical Gallery Debug] Gallery has no items (.notion-collection-item). Skipping.', '#ff9900');
        return;
    }

    const hasImages = gallery.querySelector(SELECTORS.image);
    if (!hasImages) {
        // Se non ci sono immagini, considera la galleria non ancora pronta.
        // Non marcarla come processata e riprova al prossimo cambiamento del DOM.
        customLog(`%c[Vertical Gallery Debug] No images found in this gallery. Skipping toggle creation.`, '#ff9900');
        return;
    }

    if (gallery.dataset.verticalGalleryProcessed) {
        customLog('%c[Vertical Gallery Debug] Gallery already processed. Skipping.', '#a0a0a0');
        return;
    }
    // IMPOSTA IL FLAG SOLO ORA CHE SIAMO SICURI CI SIANO LE IMMAGINI
    gallery.dataset.verticalGalleryProcessed = 'true';

    const databaseContainer = gallery.querySelector(SELECTORS.databaseContainer);
    if (!databaseContainer) {
        console.error('%c[Vertical Gallery Debug] Could not find database container. Aborting for this gallery.', '#ff4d4d');
        return;
    }

    const dbId = databaseContainer.dataset.blockId;
    customLog(`%c[Vertical Gallery Debug] Found Database ID: ${dbId}`, '#007acc');

    const { [dbId]: isEnabled = false } = await chrome.storage.local.get(dbId);
    customLog(`%c[Vertical Gallery Debug] Vertical mode for ${dbId} is currently ${isEnabled ? 'ENABLED' : 'DISABLED'}.`, '#007acc');
    setVerticalMode(gallery, isEnabled);

    // If the toggle has been hidden by the user, then don't show the toggle for this DB
    const { hiddenToggles = {} } = await chrome.storage.local.get('hiddenToggles');
    if (hiddenToggles[dbId]) {
        customLog(`%c[Vertical Gallery Debug] Toggle for DB ${dbId} is hidden by user settings. Skipping toggle creation.`, '#ff9900');
        return;
    }

    
    
    customLog('%c[Vertical Gallery Debug] Creating and adding toggle switch.', '#2eb82e');
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
      customLog(`%c[Vertical Gallery Debug] "Hide" button clicked for DB ${dbId}.`, '#ff9900');
      const header = gallery.closest('.notion-page-content')?.querySelector('.notion-header-block [contenteditable="true"]');
      const dbTitle = header ? header.textContent : `Database ID: (${dbId.substring(0, 6)}...)`;
      const { hiddenToggles = {} } = await chrome.storage.local.get('hiddenToggles');
      hiddenToggles[dbId] = dbTitle;
      await chrome.storage.local.set({ hiddenToggles });
      label.style.display = 'none';
      customLog(`%c[Vertical Gallery Debug] Toggle for DB ${dbId} is now hidden.`, '#ff9900');
    });
  /* END - Add toggle */

  // Listen for toggle value changes
  input.addEventListener('change', (event) => {
    const enabled = event.target.checked;
    customLog(`%c[Vertical Gallery Debug] Toggle switched. New state for ${dbId}: ${enabled ? 'ENABLED' : 'DISABLED'}.`, '#2eb82e');
    chrome.storage.local.set({ [dbId]: enabled });
    setVerticalMode(gallery, enabled);
  });

  customLog('%c[Vertical Gallery Debug] Successfully processed gallery and added toggle.', '#2eb82e');
}

function findAndProcessGalleries() {
  const galleries = document.querySelectorAll(SELECTORS.galleryView);
  galleries.forEach(processGallery);
  // Restituisce il numero di gallerie trovate, ci servirà per la nuova logica
  return galleries.length;
}

// --- LOGICA DI ESECUZIONE ---

// 1. L'Observer gestisce i cambiamenti DOPO il caricamento iniziale (es. cambio pagina)
const observer = new MutationObserver((mutations) => {
    // Aggiunto un log per quando l'observer rileva un cambiamento
    customLog('%c[Vertical Gallery Debug] MutationObserver detected changes on the page.', '#800080');
    findAndProcessGalleries();
});
observer.observe(document.body, { childList: true, subtree: true });
customLog('%c[Vertical Gallery Debug] MutationObserver is now watching the page.', '#800080');


// 2. Logica "paziente" per il caricamento iniziale della pagina
let attempts = 0;
const maxAttempts = 20; // Prova per 10 secondi (20 * 500ms)
customLog('%c[Vertical Gallery Debug] Starting initial page load checker...', '#007acc');
const initialLoadChecker = setInterval(() => {
  attempts++;
  const galleriesFound = findAndProcessGalleries();
  
  customLog(`%c[Vertical Gallery Debug] Initial load check attempt #${attempts}. Found ${galleriesFound} galleries.`, '#007acc');
  
  // Se troviamo almeno una galleria OPPURE se abbiamo provato abbastanza volte,
  // smettiamo di controllare per non sprecare risorse.
  if (galleriesFound > 0 || attempts >= maxAttempts) {
    clearInterval(initialLoadChecker);
    if (galleriesFound > 0) {
        customLog('%c[Vertical Gallery Debug] Galleries found on initial load. Stopping checker.', '#2eb82e');
    } else {
        customLog(`%c[Vertical Gallery Debug] Max attempts (${maxAttempts}) reached without finding galleries. Stopping checker. The MutationObserver will take over.`, '#ff9900');
    }
  }
}, 500);