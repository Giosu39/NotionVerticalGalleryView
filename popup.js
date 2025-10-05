document.addEventListener('DOMContentLoaded', () => {
    // Gestione Slider Altezza
    const slider = document.getElementById('height-slider');
    const valueDisplay = document.getElementById('slider-value');
    const resetButton = document.getElementById('reset');
    const status = document.getElementById('status');
    const defaultValue = '280';

    function save_slider_value() {
        chrome.storage.local.set({ galleryHeight: slider.value }, () => {
            status.textContent = chrome.i18n.getMessage('settingsSaved');
            setTimeout(() => { status.textContent = ''; }, 1000);
        });
    }
    
    function update_display() { valueDisplay.textContent = slider.value; }
    
    function restore_slider() {
        chrome.storage.local.get({ galleryHeight: defaultValue }, (items) => {
            slider.value = items.galleryHeight;
            update_display();
        });
    }

    function reset_to_default() {
        slider.value = defaultValue;
        update_display();
        save_slider_value();
    }

    slider.addEventListener('input', update_display);
    slider.addEventListener('change', save_slider_value);
    resetButton.addEventListener('click', reset_to_default);

    // Gestione Lista Toggle Nascosti
    const hiddenList = document.getElementById('hidden-list');
    const emptyMessage = document.getElementById('empty-message');
    
    const showIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const openLinkIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>`;

    async function loadHiddenList() {
        const { hiddenToggles = {} } = await chrome.storage.local.get('hiddenToggles');
        hiddenList.innerHTML = ''; // Pulisci la lista

        const dbIds = Object.keys(hiddenToggles);

        if (dbIds.length === 0) {
            emptyMessage.style.display = 'block';
        } else {
            emptyMessage.style.display = 'none';
            const resetButtonText = chrome.i18n.getMessage('resetToggleVisibilityButton');
            const openDbLinkText = chrome.i18n.getMessage('openDatabasePageLink') || 'Open database page';

            dbIds.forEach(id => {
                const title = hiddenToggles[id];
                const listItem = document.createElement('li');
                
                // --- MODIFICA: Struttura HTML migliorata per ogni elemento della lista ---
                listItem.innerHTML = `
                    <div class="db-info">
                        <span class="db-title" title="${title}">${title}</span>
                        <a href="#" class="open-db-link" data-db-id="${id}">
                            ${openDbLinkText}
                            ${openLinkIconSVG}
                        </a>
                    </div>
                    <button class="show-button" data-db-id="${id}" title="${resetButtonText}">
                        ${showIconSVG}
                    </button>
                `;
                // --- FINE MODIFICA ---
                hiddenList.appendChild(listItem);
            });
        }
    }

    // --- MODIFICA: Event listener più robusto per gestire i click sulle icone ---
    hiddenList.addEventListener('click', async (e) => {
        const showButton = e.target.closest('.show-button');
        const openLink = e.target.closest('.open-db-link');

        // Gestione click sul pulsante "Mostra di nuovo"
        if (showButton) {
            const dbId = showButton.dataset.dbId;
            const { hiddenToggles } = await chrome.storage.local.get('hiddenToggles');
            delete hiddenToggles[dbId];
            await chrome.storage.local.set({ hiddenToggles });
            await loadHiddenList();
        }

        // Gestione del click sul link "Open database page".
        if (openLink) {
            e.preventDefault(); // Evita il comportamento di default del link
            const dbId = openLink.dataset.dbId;
            if (dbId) {
                // Gli ID dei blocchi di Notion usati nelle URL non hanno i trattini, quindi li rimuoviamo.
                const urlDbId = dbId.replace(/-/g, '');
                chrome.tabs.create({ url: `https://www.notion.so/${urlDbId}` });
            }
        }
    });
    // --- FINE MODIFICA ---


    // Inizializza tutto
    restore_slider();
    loadHiddenList();
});
