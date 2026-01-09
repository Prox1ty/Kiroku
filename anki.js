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