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

// Track the element the user is hovering over
// document.addEventListener("mouseover", (event) => {
//     hoveredElement = event.target;
// });

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

    const response = await browser.runtime.sendMessage({
        action: "searchWord",
        word: selectedWord
    });
    try {
        if (response.success && response.data.length > 0) {
            definitionCache.set(selectedWord, response.data);
            // ---- debugging purposes
            console.log("this will run if there's an error or the script runs fine");
            console.log(response.data);
            // ----
            return response.data;
        }
        return [];
    } catch (error) {
        console.error(`Error occured after response was resolved: ${error}`);
        return [];
    }

}

async function triggerPopup(selectedText) {
    content = "";
        const ankiVer = await checkAnkiConnectivity();
        let ankiNoteButton = false;
        if (ankiVer != null) {
            ankiNoteButton = true;
            addListenerToAddNoteBtn();
        }
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

            currWordData.word = selectedText;
            currWordData.type = type;

            content += `
                <div class="wrapper">
                    <div class="word-header">
                        <span class="word">${selectedText}</span>
                        <span class="type">${type}</span>
                        ${ankiNoteButton ? `<button class="addNoteBtn">+</button>` : ``}
                        <!-- space for button that find existing note in anki -->
                    </div>
                    <div class="syn-container">${synHtml}</div>
                    <ul class="def-list">${defHtml}</ul>
                    <div class="extra-def-btn">▶ Extra Definitions</div>
                    </ul>
                    <ul class="extra-def-ul visible"></ul>
                </div>
            `;    
            createPopup(content);
        } 
}

function triggerPopupWithoutRefreshing() {
    createPopup(content);
}

function positionPopup(popupElement) {
    const selection = window.getSelection();    
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // 10 pixels below the selected text
        let top = rect.bottom + window.scrollY + 10; // accounting for scroll positions as well
        let left = rect.left + window.scrollX;  

        // ask gemini about this in a bit
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

async function checkAnkiConnectivity() {
    try {
        const response = await browser.runtime.sendMessage({
            action: "ankiStatus"
        });

        if (response.result != null && response.error == null) {
            return response.result;
        }
        console.error("Could not establish connection with anki");
        return null;
    } catch(error) {
        console.error('Internal extension messaging error: ', error);
        return null;
    } 
}

async function addListenerToAddNoteBtn() {
    const addNoteBtn = document.querySelector('.addNoteBtn');
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', () => {
            addNoteBtn.disabled = true;
            (async () => {
                try {
                    const response = await browser.runtime.sendMessage({
                        action: 'addNote',
                        data: currWordData
                    });
                    if (response.error == null && response.result != null) {
                        console.log('Request to create card has been processed');

                        addNoteBtn.disabled = false;
                        addNoteBtn.style.background = 'rgb(227, 9, 198)';
                        addNoteBtn.title = "Add duplicate?: ";

                        const wordHeader = document.querySelector('.word-header');
                        const lookupBtn = document.createElement('button');
                        lookupBtn.classList.add('lookupBtn');
                        lookupBtn.title = "Open in Anki";
                        lookupBtn.value = response.result;
                        lookupBtn.addEventListener('click', () => {
                            const cardId = lookupBtn.value;
                        });
                        // big issue. browser has no way of knowing if a card has been created for this word already
                        // figure out how to do that and if a card has been created, then the lookup button should show up without having to click addNoteBtn
                        wordHeader.appendChild(lookupBtn);

                        return response.result;
                    }
                } catch(e) {
                    console.error('Error adding note to anki: ', e);
                    return null;
                }
            })();
        });
    }   
}

function addEventListenerToLookup() {
    const lookupBtn = document.querySelector('.lookupBtn');
    lookupBtn.addEventListener('click', () => {
        const cardId = lookupBtn.value;
    }); 
}