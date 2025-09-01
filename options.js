// options.js

const slider = document.getElementById('height-slider');
const valueDisplay = document.getElementById('slider-value');
const resetButton = document.getElementById('reset');
const status = document.getElementById('status');
const defaultValue = '280';

// Funzione per salvare il valore corrente dello slider
function save_value() {
  const height = slider.value;
  chrome.storage.local.set({
    galleryHeight: height
  }, function() {
    // Mostra un messaggio di conferma che scompare
    status.textContent = 'Impostazioni salvate.';
    setTimeout(() => { status.textContent = ''; }, 1000);
  });
}

// Funzione per aggiornare il valore visualizzato accanto allo slider
function update_display() {
  valueDisplay.textContent = slider.value;
}

// Funzione per ripristinare le impostazioni salvate all'apertura
function restore_options() {
  chrome.storage.local.get({
    galleryHeight: defaultValue
  }, function(items) {
    slider.value = items.galleryHeight;
    update_display();
  });
}

// Funzione per il pulsante di reset
function reset_to_default() {
    slider.value = defaultValue;
    update_display();
    save_value();
}

// Aggiungi gli event listener
document.addEventListener('DOMContentLoaded', restore_options);
// 'input' si attiva ogni volta che lo slider si muove
slider.addEventListener('input', update_display);
// 'change' si attiva quando l'utente rilascia lo slider, per salvare
slider.addEventListener('change', save_value);
resetButton.addEventListener('click', reset_to_default);