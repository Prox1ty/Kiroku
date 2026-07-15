import { getAnkiVersion } from "../src/shared/anki.js";

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
    const allMappings = {};

    const fieldsDiv = document.getElementById('fieldsDiv');
    for (let child of fieldsDiv.children) {
        allMappings[child.id] = child.value;
    }

    browser.storage.local.set({"selectedDeck": deck});
    browser.storage.local.set({"selectedModel": noteType});
    browser.storage.local.set({"allMappings": allMappings});

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
        const storageResponse = await browser.storage.local.get({selectedModel: 'Basic'});
        const localNoteSelection = storageResponse.selectedModel;
        if (nTypes.includes(localNoteSelection)) {
            select.value = localNoteSelection;
        }

        // will fetch selectedModel from localStorage. 
        await getFields();

        select.addEventListener('change', async () => {
            await getFields(select.value);
        });

    } catch(error) {
        console.log(error);
        select.innerHTML = '<option disabled selected>Error: is Anki Open?</option>';
        saveBtn.disabled = true;
    }
}

async function getFields(selectedModel) {
    // this is triggered after note type selection.
    const storageMappings = await browser.storage.local.get('allMappings');
    const allMappings = storageMappings.allMappings;

    let modelName = selectedModel ? selectedModel : ""
    if (!modelName) {
        const storageResponse = await browser.storage.local.get('selectedModel');
        modelName = storageResponse.selectedModel;
    }
    try {
        const response = await fetch('http://127.0.0.1:8765', {
            method: 'POST',
            body: JSON.stringify({
                action: 'modelFieldNames',
                version: 5,
                params: {
                    "modelName": modelName
                }
            })
        });

        const data = await response.json();
        const fields = data.result; // can confirm the format on ankiConnect's github

        const fieldsDiv = document.getElementById('fieldsDiv');
        if (fieldsDiv) fieldsDiv.innerHTML = "";

        const allOptions = ['Word', 'Type', 'Definition', 'Synonyms', 'Sentence', 'Id'];
        fields.forEach((f) => {
            let label = document.createElement('label');
            label.htmlFor = f;
            label.textContent = f;
            let select = document.createElement('select');
            select.id = f;
            allOptions.forEach((o) => {
                let option = document.createElement('option');
                option.innerText = o;
                option.value = o;

            if (f.toLowerCase() == o.toLowerCase()) {
                option.selected = true;
            }

                select.appendChild(option);
            })

            if (fieldsDiv) {
                fieldsDiv.appendChild(label);
                fieldsDiv.appendChild(select);
            }
            
            const currMapping = allMappings[f] ? allMappings[f] : "Word";
            select.value = currMapping;
        })

    } catch (error) {
        console.error("error occured while fetching note type specific fields: ", error);
    }
}

loadDecks();
loadNoteTypes();