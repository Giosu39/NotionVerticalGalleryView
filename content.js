const SELECTORS = {
  galleryView: '.notion-gallery-view',
  galleryItem: '.notion-collection-item',
  databaseContainer: '[data-block-id]',
  pageHeader: '.notion-page-content .notion-header-block [contenteditable="true"]',
  image: 'img:not(.notion-emoji):not([src*="/icons/"])'
};

// La funzione per applicare l'altezza globale non è più necessaria qui,
// perché l'altezza verrà applicata individualmente a ogni galleria.

function setVerticalMode(galleryElement, isEnabled) {
  galleryElement.classList.toggle('vertical-mode-enabled', isEnabled);
}

/**
 * Applica un'altezza specifica a una galleria impostando una variabile CSS locale.
 * @param {HTMLElement} galleryElement L'elemento della galleria.
 * @param {number} height L'altezza in pixel.
 */
function applyGalleryHeight(galleryElement, height) {
    galleryElement.style.setProperty('--vertical-gallery-height', `${height}px`);
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
        customLog(`%c[Vertical Gallery Debug] No images found in this gallery. Skipping toggle creation.`, '#ff9900');
        return;
    }

    if (gallery.dataset.verticalGalleryProcessed) {
        customLog('%c[Vertical Gallery Debug] Gallery already processed. Skipping.', '#a0a0a0');
        return;
    }
    gallery.dataset.verticalGalleryProcessed = 'true';

    const databaseContainer = gallery.querySelector(SELECTORS.databaseContainer);
    if (!databaseContainer) {
        console.error('%c[Vertical Gallery Debug] Could not find database container. Aborting for this gallery.', '#ff4d4d');
        return;
    }

    const dbId = databaseContainer.dataset.blockId;
    customLog(`%c[Vertical Gallery Debug] Found Database ID: ${dbId}`, '#007acc');


    // 1. Recupera le impostazioni dallo storage
    const { 
        [dbId]: dbSetting, 
        galleryHeight: globalHeight = '280', 
        hiddenToggles = {} 
    } = await chrome.storage.local.get([dbId, 'galleryHeight', 'hiddenToggles']);

    // 2. Determina lo stato iniziale
    let isEnabled = false;
    let currentHeight = parseInt(globalHeight, 10);

    if (typeof dbSetting === 'number') {
        isEnabled = true;
        currentHeight = dbSetting;
    } else if (dbSetting === true) { // Per retrocompatibilità con il vecchio sistema
        isEnabled = true;
    }
    
    // 3. Applica gli stili iniziali
    setVerticalMode(gallery, isEnabled);
    if (isEnabled) {
        applyGalleryHeight(gallery, currentHeight);
    }

    if (hiddenToggles[dbId]) {
        customLog(`%c[Vertical Gallery Debug] Toggle for DB ${dbId} is hidden. Skipping UI creation.`, '#ff9900');
        return;
    }

    // 4. Crea l'interfaccia utente (Toggle e controlli altezza)
    const wrapper = document.createElement('div');
    wrapper.className = 'vertical-gallery-controls-wrapper';

    // Toggle principale
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
    const input = label.querySelector('input');
    input.checked = isEnabled;

    // Controlli per l'altezza
    const heightControls = document.createElement('div');
    heightControls.className = 'height-controls';
    heightControls.style.display = isEnabled ? 'flex' : 'none'; // Mostra solo se abilitato

    const decreaseBtn = document.createElement('button');
    decreaseBtn.textContent = '−'; // Minus sign
    decreaseBtn.className = 'height-btn decrease';
    decreaseBtn.title = 'Riduci altezza immagini';

    const heightDisplay = document.createElement('span');
    heightDisplay.className = 'height-display';
    heightDisplay.textContent = `${currentHeight}px`;

    const increaseBtn = document.createElement('button');
    increaseBtn.textContent = '+';
    increaseBtn.className = 'height-btn increase';
    increaseBtn.title = 'Aumenta altezza immagini';

    heightControls.append(decreaseBtn, heightDisplay, increaseBtn);

    // Pulsante per nascondere
    const hideButton = document.createElement('button');
    hideButton.className = 'hide-toggle-btn';
    hideButton.textContent = chrome.i18n.getMessage('hideToggleButton');
    hideButton.title = chrome.i18n.getMessage('hideToggleTitle');
    label.appendChild(hideButton);
    
    wrapper.appendChild(label);
    wrapper.appendChild(heightControls);
    gallery.prepend(wrapper);

    // 5. Aggiungi gli Event Listeners

    // Cambio di stato del toggle
    input.addEventListener('change', async (event) => {
        const enabled = event.target.checked;
        setVerticalMode(gallery, enabled);
        heightControls.style.display = enabled ? 'flex' : 'none';

        if (enabled) {
            // Quando si abilita, si usa l'altezza globale come default e la si salva
            const { galleryHeight: latestGlobalHeight = '280' } = await chrome.storage.local.get('galleryHeight');
            const newHeight = parseInt(latestGlobalHeight, 10);
            
            await chrome.storage.local.set({ [dbId]: newHeight });
            applyGalleryHeight(gallery, newHeight);
            heightDisplay.textContent = `${newHeight}px`;
        } else {
            // Quando si disabilita, si imposta a 'false'
            await chrome.storage.local.set({ [dbId]: false });
        }
    });

    // Pulsanti per regolare l'altezza
    const adjustHeight = async (amount) => {
        let height = parseInt(heightDisplay.textContent, 10);
        let newHeight = height + amount;

        // Limita l'altezza tra 150px e 500px
        if (newHeight < 150) newHeight = 150;
        if (newHeight > 500) newHeight = 500;
        
        if (newHeight !== height) {
            heightDisplay.textContent = `${newHeight}px`;
            applyGalleryHeight(gallery, newHeight);
            // Salva la nuova altezza nello storage
            await chrome.storage.local.set({ [dbId]: newHeight });
        }
    };

    decreaseBtn.addEventListener('click', () => adjustHeight(-10));
    increaseBtn.addEventListener('click', () => adjustHeight(10));

    // Listener per il pulsante "nascondi"
    hideButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const header = gallery.closest('.notion-page-content')?.querySelector('.notion-header-block [contenteditable="true"]');
        const dbTitle = header ? header.textContent : `Database ID: (${dbId.substring(0, 6)}...)`;
        const { hiddenToggles = {} } = await chrome.storage.local.get('hiddenToggles');
        hiddenToggles[dbId] = dbTitle;
        await chrome.storage.local.set({ hiddenToggles });
        wrapper.style.display = 'none';
    });

    customLog('%c[Vertical Gallery Debug] Successfully processed gallery.', '#2eb82e');
}

function findAndProcessGalleries() {
  const galleries = document.querySelectorAll(SELECTORS.galleryView);
  galleries.forEach(processGallery);
  return galleries.length;
}

// --- LOGICA DI ESECUZIONE ---

const observer = new MutationObserver(() => {
    findAndProcessGalleries();
});
observer.observe(document.body, { childList: true, subtree: true });

let attempts = 0;
const maxAttempts = 20;
const initialLoadChecker = setInterval(() => {
  attempts++;
  const galleriesFound = findAndProcessGalleries();
  if (galleriesFound > 0 || attempts >= maxAttempts) {
    clearInterval(initialLoadChecker);
  }
}, 500);
