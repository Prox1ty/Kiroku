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
        await ankiConnectInvoke('addNote', 6, payload);
        return { success: true, duplicate: false };
    } catch (err) {
        console.log("Error occured while adding anki note (anki.js): ", err);
        const message = typeof err === 'string' ? err : err?.message || String(err);
        if (/duplicate/i.test(message)) { // checking if the error message returned by ankiConnect contained the word duplicate
            return { success: false, duplicate: true, error: message };
        }

        return { success: false, duplicate: false, error: message };
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

async function findNote(id) {
    try {
        const { selectedDeck } = await browser.storage.local.get('selectedDeck');
        const query = selectedDeck ? `deck:${selectedDeck} ${id}` : `${id}`;
        const response = await ankiConnectInvoke('findCards', 6, { query });

        return Array.isArray(response) ? response : [];

    } catch (err) {
        console.error("Error occured while querying anki for note id: ", err);
        return [];
    }
}

export { getAnkiVersion, addAnkiNote, findNote };