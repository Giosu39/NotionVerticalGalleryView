// content.js

// Funzione per applicare o rimuovere la modalità verticale
function setVerticalMode(galleryElement, isEnabled) {
  galleryElement.classList.toggle('vertical-mode-enabled', isEnabled);
}

// Funzione per creare e inizializzare un interruttore per una galleria
function createToggleForGallery(gallery) {
  // Evita di aggiungere un interruttore se già esiste
  if (gallery.querySelector('.vertical-mode-toggle')) {
    return;
  }

  const databaseContainer = gallery.querySelector('[data-block-id]');
  if (!databaseContainer) return;
  
  const dbId = databaseContainer.dataset.blockId;

  // Crea gli elementi HTML per l'interruttore
  const label = document.createElement('label');
  label.className = 'vertical-mode-toggle';
  label.innerHTML = `
    Vertical Mode
    <span class="switch">
      <input type="checkbox">
      <span class="slider"></span>
    </span>
  `;

  const input = label.querySelector('input');

  // Aggiunge l'interruttore all'inizio della galleria
  gallery.prepend(label);

  // Carica lo stato salvato per questo database
  chrome.storage.local.get([dbId], (result) => {
    const isEnabled = result[dbId] || false;
    input.checked = isEnabled;
    setVerticalMode(gallery, isEnabled);
  });

  // Aggiunge l'evento per salvare la preferenza quando si clicca
  input.addEventListener('change', (event) => {
    const isEnabled = event.target.checked;
    chrome.storage.local.set({ [dbId]: isEnabled });
    setVerticalMode(gallery, isEnabled);
  });
}

// Funzione per trovare tutte le gallerie sulla pagina e aggiungere gli interruttori
function findAndProcessGalleries() {
  const galleries = document.querySelectorAll('.notion-gallery-view');
  galleries.forEach(createToggleForGallery);
}

// Notion carica i contenuti dinamicamente, quindi dobbiamo osservare i cambiamenti
// nel DOM per trovare nuove gallerie quando vengono caricate.
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      findAndProcessGalleries();
      break; 
    }
  }
});

// Avvia l'osservatore e la prima scansione della pagina
observer.observe(document.body, { childList: true, subtree: true });
findAndProcessGalleries();