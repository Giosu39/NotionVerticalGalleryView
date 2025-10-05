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
    const resetButtonText = chrome.i18n.getMessage('resetToggleVisibilityButton');
    // Testo per il nuovo link. Potresti voler aggiungere la chiave 'openDatabasePageLink' ai tuoi file i18n
    const openDbLinkText = chrome.i18n.getMessage('openDatabasePageLink') || 'Open database page';


    async function loadHiddenList() {
        const { hiddenToggles = {} } = await chrome.storage.local.get('hiddenToggles');
        hiddenList.innerHTML = ''; // Pulisci la lista

        const dbIds = Object.keys(hiddenToggles);

        if (dbIds.length === 0) {
            emptyMessage.style.display = 'block';
        } else {
            emptyMessage.style.display = 'none';
            dbIds.forEach(id => {
                const title = hiddenToggles[id];
                const listItem = document.createElement('li');
                
                listItem.innerHTML = `
                    <div class="list-item-main-content">
                        <span title="${title}">${title}</span>
                        <button data-db-id="${id}">${resetButtonText}</button>
                    </div>
                    <a href="#" class="open-db-link" data-db-id="${id}">${openDbLinkText}</a>
                `;
                // --- FINE MODIFICA ---
                hiddenList.appendChild(listItem);
            });
        }
    }

    hiddenList.addEventListener('click', async (e) => {
        const target = e.target;

        // Gestione click sul pulsante "Mostra di nuovo"
        if (target.tagName === 'BUTTON') {
            const dbId = target.dataset.dbId;
            const { hiddenToggles } = await chrome.storage.local.get('hiddenToggles');
            delete hiddenToggles[dbId];
            await chrome.storage.local.set({ hiddenToggles });
            await loadHiddenList();
        }

        // --- MODIFICA ---
        // Gestione del click sul link "Open database page".
        if (target.tagName === 'A' && target.classList.contains('open-db-link')) {
            e.preventDefault(); // Evita il comportamento di default del link
            const dbId = target.dataset.dbId;
            if (dbId) {
                // Gli ID dei blocchi di Notion usati nelle URL non hanno i trattini, quindi li rimuoviamo.
                const urlDbId = dbId.replace(/-/g, '');
                chrome.tabs.create({ url: `https://www.notion.so/${urlDbId}` });
            }
        }
        // --- FINE MODIFICA ---
    });

    // Inizializza tutto
    restore_slider();
    loadHiddenList();
});
