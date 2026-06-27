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
    console.log("got list of decks", result); // json object

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
    try {
        const settings = await browser.storage.local.get(['selectedModel', 'allMappings', 'selectedDeck']);
    
        const mapping = settings.allMappings || { Word: "Word", Definition: "Definition" };
        const deckName = settings.selectedDeck;
        const modelName = settings.selectedModel;

        for (let key of Object.keys(mapping)) {
            let val = mapping[key];
            if (val == "Word") {
                val = entryData.word;
            } else if (val == "Definition") {
                val = entryData.definition;
            } else if (val == "Synonyms") {
                val = entryData.synonyms;
            } else if (val == "Sentence") {
                val = entryData.sentence;
            } else if (val == "Type") {
                val = entryData.type;
            } else if (val == "Id") {
                val = String(entryData.id);
            }
            mapping[key] = val;
        } 

        const payload = {
             "note": {
                "deckName": deckName,
                "modelName": modelName,
                "fields": mapping,
                "tags": [
                    entryData.tabName,
                    "Made By Muaaz"
                ],
            }
        }
        console.log(deckName);
        console.log(modelName);
        console.log(payload);
        const response = await ankiConnectInvoke('addNote', 6, payload);

        const data = typeof response.json === 'function' ? await response.json() : response;
        if (data.result != null || data.error == null) {
            return true;
        }
    } catch (err) {
        console.log("Error occured while adding anki note (anki.js): ", err);
        return false;
    }

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

export { getAnkiVersion, addAnkiNote };