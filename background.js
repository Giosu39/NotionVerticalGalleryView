// background.js

chrome.runtime.onInstalled.addListener((details) => {
  // LOGICA ESISTENTE: Imposta le regole per mostrare l'icona dell'estensione
  // solo quando l'utente si trova su una pagina di Notion.
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostSuffix: 'notion.so' },
          }),
        ],
        actions: [new chrome.declarativeContent.ShowAction()],
      },
    ]);
  });

  // Controlla se l'evento è una prima installazione.
  if (details.reason === 'install') {
    // Cerca tutte le schede (tab) che sono già aperte sull'URL di Notion.
    chrome.tabs.query({ url: "*://*.notion.so/*" }, (tabs) => {
      // Per ogni scheda di Notion trovata...
      for (const tab of tabs) {
        // ...inietta programmaticamente i content script.
        // Questo fa sì che l'estensione funzioni subito, senza che
        // l'utente debba ricaricare le pagine di Notion già aperte.

        // Inietta il file CSS
        chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['styles.css'],
        });
        
        // Inietta il file JavaScript
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });
      }
    });
  }
});
