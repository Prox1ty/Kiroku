import { getAnkiVersion } from "../src/shared/anki.js";

async function showStatus(message) {
    const banner = document.getElementById('db-status-banner');
    const text = document.getElementById('db-status-banner-text');
    if (banner && text) {
        banner.style.display = 'flex';
        text.textContent = message;
    }
}   

// check if this is a fresh installation context
(async () => {
    const data = await browser.storage.local.get("FIRST_INSTALL");
    const isFirstInstall = data.FIRST_INSTALL;

    if (isFirstInstall) {
        // Create the notification window container
        let firstInstallWindow = document.createElement('div');
        firstInstallWindow.id = 'kiroku-install-notifier';
        
        firstInstallWindow.innerHTML = `
            <div class="kiroku-install-content">
                <div class="kiroku-install-header">
                    <span class="kiroku-title">🌸 Kiroku Dictionary</span>
                    <button id="kiroku-close-install-btn">&times;</button>
                </div>
                <div class="kiroku-install-body">
                    <div class="kiroku-spinner"></div>
                    <p>Initializing local WordNet dictionary data. Please wait while the database is seeding...</p>
                </div>
            </div>
        `;

        document.body.appendChild(firstInstallWindow);

        // Close button handler (manual dismissal)
        const closeBtn = firstInstallWindow.querySelector('#kiroku-close-install-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                firstInstallWindow.remove();
            });
        }

        browser.runtime.onMessage.addListener((message) => {
            if (message.action === "seedingComplete") {
                const bodyText = firstInstallWindow.querySelector('.kiroku-install-body p');
                const spinner = firstInstallWindow.querySelector('.kiroku-spinner');
                
                if (bodyText) {
                    bodyText.textContent = "Database seeded successfully! Press Ctrl/Cmd to look up words.";
                }
                if (spinner) {
                    spinner.style.display = 'none';
                }
                
                // Auto-dismiss the notification 4 seconds after completion
                setTimeout(() => {
                    if (document.getElementById('kiroku-install-notifier')) {
                        firstInstallWindow.remove();
                    }
                }, 4000);
            }
        });
    }
})();


browser.storage.local.get("FIRST_INSTALL").then((data) => {
    if (data.FIRST_INSTALL) {
        showStatus("Initializing dictionary database... please hold on.");
    }
});

browser.runtime.onMessage.addListener((message) => {
    if (message.action === "seedingComplete") {
        showStatus("Database ready to roll!");
    }
});

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
        await getFields(select.value);

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
    const allMappings = storageMappings.allMappings || {};

    let modelName = selectedModel ? selectedModel : "";
    if (!modelName) {
        const storageResponse = await browser.storage.local.get('selectedModel');
        modelName = storageResponse.selectedModel || document.getElementById('noteType').value || "Basic";
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
        const fields = data.result || []; // can confirm the format on ankiConnect's github

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
            const fallbackDefault = f.toLowerCase() == 'id' ? 'Id' : 
            allOptions.map(o => o.toLowerCase()).includes(f.toLowerCase()) ? f : "Word";
            const currMapping = allMappings[f] ? allMappings[f] : fallbackDefault;
            select.value = currMapping;
        })

    } catch (error) {
        console.error("error occured while fetching note type specific fields: ", error);
    }
}

loadDecks();
loadNoteTypes();