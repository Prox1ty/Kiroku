let hoveredElement = null;
let popup = null;
let data = null;
let dataLoaded = false;

let currWordData = {
    word: "",
    type: "",
    definition: [],
    synonym: [],
    sentence: []
}

document.addEventListener("click", (event) => {
    try {
        if (popup) {
            if (event.target !== popup || !popup.contains(event.target)) {
                console.log(event.target) // debugging purposes, checking what this prints for different elements
                document.body.removeChild(popup);
                popup = null;
            }
        }
    } catch (error) {
        console.log(`no popup found. Error code : ${error}`);
    }
})

// Create popup element
const createPopup = (content) => {
    removePopup();
    popup = document.createElement("div");
    popup.classList.add("popup");

    popup.innerHTML = content

    popup.addEventListener("click", (event) => {
        event.stopPropagation(); // prevent popup from closing by clicking inside the popup window
    });

    const extraDefButton = popup.querySelector(".extra-def-btn");

    if (extraDefButton) {
        extraDefButton.addEventListener('click', () => {
            const extraDefList = popup.querySelector(".extra-def-ul");
            if (extraDefList) {
                extraDefList.classList.toggle("visible");
                extraDefButton.innerText = extraDefList.classList.contains("visible") ? "▶ Show Extra" : "▼ Hide Extra";
            }
        })
    }

    positionPopup(popup);
    document.body.appendChild(popup);
    console.log("pop!")
}

const clearPopupBanner = () => {
    if (!popup) {
        return;
    }

    const existingBanner = popup.querySelector(".anki-duplicate-banner");
    if (existingBanner) {
        existingBanner.remove();
    }
}

const showDuplicateBanner = () => {
    if (!popup) {
        return;
    }

    clearPopupBanner();

    const banner = document.createElement("div");
    banner.className = "anki-duplicate-banner";
    banner.textContent = "Expression already added to Anki";

    popup.appendChild(banner);
}

const removePopup = () => {
    try {
        if (popup) {
            document.body.removeChild(popup);
            popup = null;
        }
    } catch (error) {
        console.log(`no popup found. Error code : ${error}`);
    }

}

// Listen for key press on the entire window
let keyActive = false;
let content = "";
let lastWord = "";
let wordFound = false;


window.addEventListener('keydown', async (event) => {
    if (event.ctrlKey || event.metaKey && !keyActive) {
        keyActive = true;
        // Get the selected text within the hovered element
        let selectedText = window.getSelection().toString().toLowerCase().trim();
        
        // Handling Re-lookups
        if (lastWord == selectedText && wordFound) {
            triggerPopupWithoutRefreshing(content);
        } else {
            lastWord = selectedText;
            await triggerPopup(selectedText);
        }
        
    }
});

window.addEventListener('keyup', () => {
    keyActive = false;
})

const definitionCache = new Map();

async function getDefinition(selectedWord) {
    if (definitionCache.has(selectedWord)) {
        return definitionCache.get(selectedWord);
    }

    try {
        const response = await browser.runtime.sendMessage({
            action: "searchWord",
            word: selectedWord
        });

        if (response.success && response.data.length > 0) {
            definitionCache.set(selectedWord, response.data);
            // ---- debugging purposes
            console.log("this will run if there's an error or the script runs fine");
            console.log(response.data);
            // ----
            return response.data;
        }
        console.log("Error possibly?");
        return [];
    } catch (error) {
        console.error(`Error occured after response was resolved: ${error}`);
        return [];
    }

}

let activePopupEntries = {}; // store current popup entries

async function triggerPopup(selectedText) {
    content = "";
    const ankiVer = await checkAnkiConnectivity();
    const ankiButtons = [];
    let ankiNoteButton = false;
    if (ankiVer) {
        ankiNoteButton = true;
    }

    if (ankiNoteButton) {
        const addNoteBtnHTML = `<button class="addNoteBtn"> + </button>`
        const ankiLookupBtnHTML = `<button id="lookUpBtn"> ? </button>`

        ankiButtons.push(ankiLookupBtnHTML);
        ankiButtons.push(addNoteBtnHTML);
    }

    const ankiButtonsHTML = ankiButtons.join("");

    console.log(ankiVer);

    const dict = await getDefinition(selectedText); 
    if (dict.length === 0) {
        wordFound = false;
        return;
    } else {
        wordFound = true;
    }
    for (let entry of dict) {

        let synHtml = entry.synonym.map(s => {
            currWordData.synonym.push(s);
            return `<span class="synonym">${s}</span>`
        }).join("");

        let defHtml = entry.definition.map((d, i) => {
            currWordData.definition.push(d);
            currWordData.sentence.push(entry.sentence[i]);
            const sentence = entry.sentence[i] ? `<span class="sentence">${entry.sentence[i]}</span>` : "";
            return `<li class="def-item">${d}${sentence}</li>`
        }).join("");    

        let type = entry.type;

        // these are here to save time by not doing everything all over again.
        // since currWordData is already storing the correct data, we will reuse it for now.

        currWordData.word = selectedText; 
        currWordData.type = type;
        currWordData.tabName = document.title;
        currWordData.id = entry.id;

        // gonna try not to touch whats already working...
        
        let ankiDef = currWordData.definition.map((d) => {
            return `<span class="definition">${d}</span>`
        }).join(""); // custom for my note type
        let ankiSentence = currWordData.sentence.map((s) => {
            return `<span class="sentence">${s}</span>`;
        }).join(""); // custom for my note type 

        // saving here
        activePopupEntries[entry.id] = {
            "word": selectedText,
            "type": type,
            "definition": ankiDef,
            "sentence": ankiSentence,
            "synonyms": synHtml, // keeping this the same
            "tabName": `${currWordData.tabName}`,
            "id": currWordData.id
        }

        // entry id stored in parent of ankiButtons
        content += `
            <div class="wrapper" data-entry-id="${entry.id}">
                <div id="upper-box">
                    <div class="word-header">
                        <span class="word">${selectedText}</span>
                        <span class="type">${type}</span>
                    </div>
                    <div class="ankiBtnDiv" data-id="${entry.id}">${ankiButtonsHTML}</div> 
                </div> 
                <div class="syn-container">${synHtml}</div>
                <ul class="def-list">${defHtml}</ul>
                <div class="extra-def-btn">▶ Extra Definitions</div>
                </ul>
                <ul class="extra-def-ul visible"></ul>
            </div>
        `;    
    } 
    createPopup(content);
    attachAnkiButtonListeners();
}

function triggerPopupWithoutRefreshing() {
    createPopup(content);
    attachAnkiButtonListeners();
}

function positionPopup(popupElement) {
    const selection = window.getSelection();    
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // 10 pixels below the selected text
        let top = rect.bottom + window.scrollY + 10; // accounting for scroll positions as well
        let left = rect.left + window.scrollX;  

        if (left + 350 > window.innerWidth) // popup width is 350px
        {
            left = window.innerWidth - 400;
        }
        if (top + 400 > window.innerHeight) {
            top = window.innerHeight - 350;
        } 

        popupElement.style.top = `${top}px`;
        popupElement.style.left = `${left}px`;

    }
}

function attachAnkiButtonListeners() {
    const buttons = document.querySelectorAll('.addNoteBtn');
    buttons.forEach(button => {
        button.addEventListener('click', async(event) => {
            const parentContainer = event.target.closest('.ankiBtnDiv');
            const entryId = parentContainer ? parentContainer.dataset.id : null;

            if (entryId) {
                const entryData = activePopupEntries[entryId];
                addNote(entryData, event.target);
            }
        })
    })
}

async function checkAnkiConnectivity() {
    
    try {

        const response = await browser.runtime.sendMessage({
            action: "ankiStatus"
        });
        console.log(response);
        const connected = (typeof response.data == "number" ? true : false); // ankiStatus always returns a version number. Upon failure it will return empty object
        if (connected) {
            return response.data;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error connecting to anki: ", error);
        return null;
    }
}

async function addNote(expressionObject, addNoteBtn) {
    // check connectivity before adding.
    console.log("add note function running");
    try {
        addNoteBtn.classList.add('gray-out');
        const response = await checkAnkiConnectivity();
        if (typeof response == "number") {
            // send a message
            console.log("Anki version received, Anki is active. Adding note to Anki.");
            const msgResponse = await browser.runtime.sendMessage({ action: "addNote", version: 5, params: expressionObject })
            console.log("Add note message sent to service worker");
            if (msgResponse.duplicate) {
                addNoteBtn.classList.add('duplicate');
                showDuplicateBanner();
            } else if (msgResponse.success == true && msgResponse.data != false) {
                console.log("Response succeeded.");
                clearPopupBanner();
                addNoteBtn.classList.add("added");
            } else if (msgResponse.data == false) {
                console.log("Adding anki note FAILED");
            } 
            // do something for the lookup button too.
        }
    } catch(err) {
        console.error("Failed to add card to anki: ", err);
    } finally {
        addNoteBtn.classList.remove('gray-out');
    }
}