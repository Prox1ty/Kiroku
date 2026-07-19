import '../vendor/browser-polyfill.js';
import '../vendor/dexie.js'; // Assumes dexie.js supports default export or is bundled
import { getAnkiVersion, addAnkiNote, findNote, getDecks } from '../shared/anki.js';

console.log('BACKGROUND SERVICE IS RUNNING');

const db = new Dexie("DictionaryDB");
// 
db.version(1).stores({
    dictionary: '++id, word'
});


browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
        console.log("Extension installed successfully. Starting one-time seeding...");
        try{
            await db.open();
            await seedDictionary();
        } catch(err) {
            console.error("Database initialization failed:", err);
        }
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

// dictionary parser also integrated in here

async function fillDB(fileURL, db, typeWord) {
    try {
        const response = await fetch(browser.runtime.getURL(fileURL)); // fetching directly
        if (!response.ok) {
            // handle errors
            console.error(`Error occured while trying to read ${typeWord} file`);
            return;
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

            // parse word count from hex
            const wCnt = parseInt(line[3], 16);
            const wordsInSynset = [];
            // collect the words
            for (let i = 0; i <wCnt; i++) {
                const wordIdx = 4 + (i * 2); // skipping the lexid in between
                const rawWord = line[wordIdx];
                if (rawWord) {
                    let cleanWord = rawWord.replace(/_/g, ' ').toLowerCase();
                    cleanWord = cleanWord.replace(/\([a-z]\)$/, ''); // strip trailing markers like (a)
                    wordsInSynset.push(cleanWord);
                }
            }


            const synonyms = [];
            const defArr = [];
            const sentenceArr = [];

            // edge case, definition part sometimes has sentence as well - wrapped in quotes
            if (def.includes(';')) {
                for (let part of def.split(';')) {
                    part = part.trim();
                    if (part.startsWith('"') || part.startsWith("'")) {
                        sentenceArr.push(part.replace(/^["']|["']$/g, ''));
                    } else {
                        defArr.push(part);
                    }
                }
            } else {
                defArr.push(def);
            }

            // create independent database record for every word in the current synset
            for (const currentWord of wordsInSynset) {
                // words in the same row are considered as synonyms
                const synonyms = wordsInSynset.filter(w => w !== currentWord);
                // pushing in batch
                batch.push({
                    word: currentWord,
                    type: typeWord,
                    definition: defArr,
                    synonym: synonyms,
                    sentence: sentenceArr.length > 0 ? sentenceArr : "No example sentence"
                });
            }

            // will add sentence later        
            if (batch.length >= batchSize) {
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
        .then(res => { 
            return sendResponse({success: true, data: res})
        })
        .catch(err => sendResponse({success: false, data: err.message}))



        return true; // keep channel open for async response

    }   else if (message.action === "ankiStatus") {
            getAnkiVersion()
            .then(res=> sendResponse({success: true, data: res}))
            .catch(err=> sendResponse({success: false, error: err?.message || err}));
            
            return true; // keep channel open for async response

    }   else if (message.action === 'fetchDecks') {
            getDecks()
            .then(res => sendResponse({success: true, data: res}))
            .catch(err => sendResponse({success: false, data: null}));

            return true;
    }   else if (message.action === "addNote") {
            findNote(message.params.id)
            .then(res => {
                if (res.length >= 1) {
                    sendResponse({ success: true, data: res, duplicate: true });
                    return;
                }

                return addAnkiNote(message.params)
                .then(res => sendResponse({ success: res.success, data: res, duplicate: res.duplicate }))
                .catch(err => sendResponse({ success: false, data: null, duplicate: false }));
            })
            .catch(err => {
                console.log("Error querying anki for existing/non-existing word");
                return sendResponse({ success: false, data: null, duplicate: false })
            })
    }   
            
        return true;
});
