import { getAnkiVersion } from "../anki.js";

const saveBtn = document.getElementById('saveBtn');
saveBtn.disabled = false;

async function loadDecks() {
    const select = document.getElementById('deckSelect');
    try {
        const connection = await getAnkiVersion();
        if (connection?.error != null) {
            throw new TypeError("Anki Connection failed");
        }
        const response = await fetch('http://127.0.0.1:8765', {
            method: 'POST',
            body: JSON.stringify({ action: "deckNames", version: 5 })
        });

        const data = await response.json();
        const decks = data.result;

        // select.innerHTML = '';
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
        console.log(error);
        select.innerHTML = '<option disabled selected>Error: is Anki Open?</option>';
        saveBtn.disabled = true;
    }
}

document.getElementById('saveBtn').addEventListener('click', () => {
    const deck = document.getElementById('deckSelect').value;
    const noteType = document.getElementById('noteType').value;

    browser.storage.local.set({selectedDeck: deck});
    browser.storage.local.set({selectedModel: noteType});

    alert('Settings Saved!');
});

async function loadNoteTypes() {
    const select = document.getElementById('noteType');
    try {
        const connection = await getAnkiVersion();
        if (connection?.error != null) {
            throw new TypeError("Anki Connection failed");
        }
        const response = await fetch('http://127.0.0.1:8765', {
            method: 'POST',
            body: JSON.stringify({
                action: 'modelNames',
                version: 5    
            })
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        const nTypes = data.result;

        select.innerHTML = '';
        nTypes.forEach((t) => {
            let opt = document.createElement('option');
            opt.value = t;
            opt.innerText = t;
            select.appendChild(opt);
        })

        const localNoteSelection = browser.storage.local.get({selectedModel: 'Basic'});
        if (nTypes.includes(localNoteSelection)) {
            select.value = localNoteSelection;
        }

    } catch(error) {
        console.log(error);
        select.innerHTML = '<option disabled selected>Error: is Anki Open?</option>';
        saveBtn.disabled = true;
    }
}

loadDecks();
loadNoteTypes();