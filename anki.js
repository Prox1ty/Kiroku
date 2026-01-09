importScripts('./browser-polyfill.js');
async function ankiConnectInvoke(action, version, params={}) {
    try {
        const response = await fetch('http://127.0.0.1:8765', {
            method: 'POST',
            body: JSON.stringify({ action, version, params })
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw data.error;
        }
        return data.result;
    } catch (error) {
        console.error(`AnkiConnect error: `, error);
        throw error;
    }
        
}

// Anki Logic

async function getDecks() {
    try {
    const result = await ankiConnectInvoke('deckNames', 5);
    return result;

    } catch (e) {
        console.error(`error getting decks ${e}`);
    }
}

async function getNoteTypes() {
    try {
        const result = await ankiConnectInvoke('modelNames', 5);
        return result;
    } catch (e) {
        console.error(`error getting modelNames ${e}`);
    }
}

function fillTemplate(template, data) {
    return template.replace(/{(\w+)}/g, (match, key) => {
        return data[key] || match;
    });
}

async function addAnkiNote(entryData) {
    const settings = await browser.storage.local.get(['selectedModel', 'allMappings', 'deckName']);
    const mapping = settings.allMappings[settings.selectedModel];

    const deckName = settings.selectedDeck;
    const modelName = settings.selectedModel;
    const template = settings.allMappings[modelName];

    const finalFields = {};
    for (const [ankiField, template] of Object.entries(mapping)) {
        finalFields[ankiField] = fillTemplate(template, entryData);
    }
    // fix this later

    console.log(finalFields);

    // const result = await ankiConnectInvoke('addNote', 5, {
    //     "note": {
    //         "deckName": deckName,
    //         "modelName": modelName,
    //         "fields": mapping
    //     }
    // });
    
}

async function getAnkiVersion() {
    try {
        const response = await ankiConnectInvoke('version', 5);
        if (response) {
            console.log("Connected to anki. Version: ", response);
            return response;
        }
    } catch (error) {
        console.error("An error occured while connecting to anki");
        return error;
    }
}
