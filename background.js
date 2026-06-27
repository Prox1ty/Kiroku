import './browser-polyfill.js';
import './dexie.js'; // Assumes dexie.js supports default export or is bundled
import { getAnkiVersion } from './anki.js';

console.log('BACKGROUND SERVICE IS RUNNING');

const db = new Dexie("DictionaryDB");
// 
db.version(1).stores({
    dictionary: '++id, word'
});


browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        console.log("Extension installed successfully. Starting one-time seeding...");
        (async () => {
            await db.open();
        })();

        return seedDictionary();
    } else if (details.reason === "update") {
        console.log("Extension updated. Check if DB schema needs refresh.");
        // will add later
    }

})

async function seedDictionary() {
    const count = await db.dictionary.count();

    if (count > 0) {
        console.log("Database has already been populated. Exiting...");
        return null;
    }

    const files = [
        {
            url: "dict/data.noun",
            type: "noun"
        },
        {
            url: "dict/data.verb",
            type: "verb"
        },
        {
            url: "dict/data.adj",
            type: "adjective"
        },
        {
            url: "dict/data.adv",
            type: "adverb"
        },
    ]

    // if count is 0
    console.log("Database empty. Fetching dictionary data");

    for (const file of files) {
        await fillDB(file.url, db, file.type);
    }

}

async function fillDB(fileURL, db, typeWord) {
    try {
        const response = await fetch(browser.runtime.getURL(fileURL)); // fetching directly
        if (!response.ok) {
            // handle errors
            console.error(`Error occured while trying to read ${typeWord} file`);
        }
        const textRes = (await response.text()).split('\n');
        const batchSize = 2000;
        let batch = [];


        for (const entry of textRes) {
            if (!entry.trim()) continue; // Skip empty lines
            // split by spaces

            const line = entry.split(' ');

            const parts = entry.split('|');
            if (!parts[1]) continue;
            const def = parts[1];

            const Word = line[4]
            const synonyms = [];
            const defArr = [];
            const sentenceArr = [];

            // edge case, definition part sometimes has sentence as well - wrapped in quotes
            if (def.includes(';')) {
                for (let part of def.split(';')) {
                    part = part.trim();
                    if (part.startsWith('"')) {
                        sentenceArr.push(part);
                    } else {
                        defArr.push(part);
                    }
                }
            } else {
                defArr.push(def);
            }

            // checking if index 6 contains a synonym.

            if (isNaN(line[6])) {
                synonyms.push(line[6]);
                synonyms.push(line[8]);
            }

            batch.push({
                word: Word ? Word.toLowerCase() : "unknown",
                type: typeWord,
                definition: defArr,
                synonym: synonyms,
                sentence: sentenceArr.length > 0 ? sentenceArr : "No example sentence"
            });
            // will add sentence later        
            if (batch.length >= batchSize) {
                // transaction (i have no idea what this is)
                await db.transaction('rw', db.dictionary, async () => {
                    await db.dictionary.bulkPut(batch).catch(err => {
                        console.error("bulkput failed", err);
                    });
                });
                // clearing batch to prepare for the next batch
                batch = [];
            }
        }

        if (batch.length > 0) {
            await db.dictionary.bulkPut(batch).catch(err => {
                console.error("bulkput failed", err);
            });;
        }
        console.log(`Finished loading ${typeWord}`);

    } catch (error) {
        console.error(`Error occured while trying to read ${typeWord} file: ${error}`);
    }
}

// listening for messages for database calls
browser.runtime.onMessage.addListener((message, _, sendResponse) => { // middle "sender" paremter is 
    // not needed
    if (message.action === "searchWord") {
        db.dictionary.where('word')
        .equals(message.word.toLowerCase())
        .toArray()
        .then(res => sendResponse({success: true, data: res}))
        .catch(err => sendResponse({success: false, data: err.message}))

        return true; // keep channel open for async response

        }   else if (message.action === "ankiStatus") {
            getAnkiVersion()
            .then(res=> sendResponse({success: true, data: res}))
            .catch(err=> sendResponse({success: false, error: error.message || err}));
            
            return true; // keep channel open for async response

        }   else if (message.action === 'fetchDecks') {
            getDecks()
            .then(res => sendResponse({success: true, data: res}))
            .catch(err => sendResponse({success: false, data: null}));

            return true;
        }   
    });
