// background.js

chrome.runtime.onInstalled.addListener(() => {
  // Rimuovi eventuali regole precedenti per assicurarti di partire da zero
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    // Aggiungi la nuova regola, corretta
    chrome.declarativeContent.onPageChanged.addRules([
      {
        // CONDIZIONE: questa regola si attiva se...
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            // ...l'URL della pagina termina con 'notion.so'
            pageUrl: { hostSuffix: 'notion.so' },
          }),
        ],
        // AZIONE: ...allora mostra l'icona dell'estensione.
        actions: [ new chrome.declarativeContent.ShowAction() ],
      },
    ]);
  });
});