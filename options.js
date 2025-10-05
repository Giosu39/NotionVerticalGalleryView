document.addEventListener('DOMContentLoaded', () => {
    const reviewLink = document.getElementById('review-link');
    if (reviewLink) {
        reviewLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Costruisce l'URL per la pagina delle recensioni dinamicamente
            const reviewUrl = `https://chrome.google.com/webstore/detail/${chrome.runtime.id}/reviews`;
            chrome.tabs.create({ url: reviewUrl });
        });
    }
});
