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

// Funzione principale, ora asincrona per gestire l'attesa della memoria
async function createToggleForGallery(gallery) {
  const databaseContainer = gallery.querySelector('[data-block-id]');
  if (!databaseContainer) return;
  const dbId = databaseContainer.dataset.blockId;

  // 1. CONTROLLO INIZIALE: Verifica se questo toggle deve essere nascosto
  const { hiddenToggles = {} } = await chrome.storage.local.get('hiddenToggles');
  if (hiddenToggles[dbId]) {
    return; // Se è nella lista dei nascosti, non creare il toggle
  }

  const hasImages = gallery.querySelector('.notion-collection-item img:not(.notion-emoji):not([src*="/icons/"])');
  if (!hasImages) return;

  if (gallery.querySelector('.vertical-mode-toggle')) return;

  // Crea gli elementi base del toggle
  const label = document.createElement('label');
  label.className = 'vertical-mode-toggle';
  label.innerHTML = `
    <span class="toggle-text">Vertical Mode</span>
    <span class="switch">
      <input type="checkbox">
      <span class="slider"></span>
    </span>
  `;
  
  // 2. CREA E AGGIUNGI IL PULSANTE "NASCONDI"
  const hideButton = document.createElement('button');
  hideButton.className = 'hide-toggle-btn';
  hideButton.textContent = '❌ Hide toggle';
  hideButton.title = 'Hide toggle. You can restore its visibility from the extension settings.';
  label.appendChild(hideButton);

  const input = label.querySelector('input');
  gallery.prepend(label);

  // 3. AGGIUNGI LA LOGICA AL PULSANTE "NASCONDI"
  hideButton.addEventListener('click', async (e) => {
    e.preventDefault(); // Evita di attivare il toggle
    e.stopPropagation();

    // Trova il titolo del database (spesso in un header sopra la galleria)
    const header = gallery.closest('.notion-page-content')?.querySelector('.notion-header-block [contenteditable="true"]');
    const dbTitle = header ? header.textContent : `Database ID: (${dbId.substring(0, 6)}...)`;
    
    const { hiddenToggles = {} } = await chrome.storage.local.get('hiddenToggles');
    hiddenToggles[dbId] = dbTitle; // Salva ID e titolo
    await chrome.storage.local.set({ hiddenToggles });
    
    label.style.display = 'none'; // Nascondi il toggle immediatamente
  });

  // Logica esistente per caricare e salvare lo stato del toggle
  const { [dbId]: isEnabled = false } = await chrome.storage.local.get(dbId);
  input.checked = isEnabled;
  setVerticalMode(gallery, isEnabled);

  input.addEventListener('change', (event) => {
    const enabled = event.target.checked;
    chrome.storage.local.set({ [dbId]: enabled });
    setVerticalMode(gallery, enabled);
  });
}

function findAndProcessGalleries() {
    document.querySelectorAll('.notion-gallery-view').forEach(createToggleForGallery);
}

const observer = new MutationObserver(() => findAndProcessGalleries());
observer.observe(document.body, { childList: true, subtree: true });
findAndProcessGalleries();