async function loadDecks() {
    const select = document.getElementById('deckSelect');
    try {
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = false;
        const response = await fetch('http://127.0.0.1:8765', {
            method: 'POST',
            body: JSON.stringify({ action: "deckNames", version: 5 })
        });

        const data = await response.json();
        const decks = data.result;

        select.innerHTML = '';
        decks.forEach((deck) => {
            const opt = document.createElement('option');
            opt.value = deck;
            opt.textContent = deck;
            select.appendChild(opt);
        });

        const result = await browser.storage.local.get({selectedDeck: 'Default'});
        if (decks.includes(result.selectedDeck)) {
            select.value = result.selectedDeck;
        }
    } catch (error) {
        select.innerHTML = '<option disabled selected>Error: is Anki Open?</option>';
        saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = true;
    }
}

document.getElementById('saveBtn').addEventListener('click', () => {
    const deck = document.getElementById('deckSelect').value;
    browser.storage.local.set({selectedDeck: deck});
    alert('Settings Saved!');
});

loadDecks();