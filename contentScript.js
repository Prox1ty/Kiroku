let hoveredElement = null;
let popup = null;
let data = null;
let dataLoaded = false;

// Track the element the user is hovering over
// document.addEventListener("mouseover", (event) => {
//     hoveredElement = event.target;
// });

document.addEventListener("click", (event) => {
    try {
        if (popup) {
            if (event.target !== popup || !popup.contains(event.target)) {
                console.log(event.target)
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
        event.stopPropagation();
    });

    const extraDefButton = popup.querySelector(".extra-def-btn");

    if (extraDefButton) {
        extraDefButton.addEventListener('click', () => {
            const extraDefList = popup.querySelector(".extra-def-ul");
            if (extraDefList) {
                extraDefList.classList.toggle("visible");
            }
        })
    }

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
let lastWord;

window.addEventListener('keydown', async (event) => {
    if (event.ctrlKey || event.metaKey && !keyActive) {
        keyActive = true;
        // Get the selected text within the hovered element
        let selectedText = window.getSelection().toString().toLowerCase().trim();
        
        // Handling Re-lookups
        if (lastWord == selectedText) {
            triggerPopupWithoutRefreshing(content)
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
        const dict = await getDefinition(selectedText);
        if (dict.length === 0) {
            return;
        }
        for (let entry of dict) {
            let defs = entry.definition;
            // formatting definitions
            let printableDef = "";

            for (let def of defs) {
                printableDef += `<li class="def">${def}</li><br>`;
            }

            let sentences = entry.sentence;
            // formatting sentences
            let printableSentences = "";
            if (!(typeof(sentences) === 'string')) {
                for (let sentence of sentences) {
                    printableSentences += `<li class="sentence">"${sentence}"</li><br>`;
                }
            } else {
                printableSentences += 'No sentences available';
            }

            let type = entry.type;

            // formatting synonyms
            let synonyms = entry.synonym;
            let printableSynonyms = "";
            if (synonyms.length > 0) {
                let cnt = 0;
                for (syn of synonyms) {
                    printableSynonyms += `<h3 class="synonym">${synonyms}</h3>\t`;
                }
            }

            content += `
                    <div class="wrapper">
                        <div class="main">
                            <h2 class="word">${selectedText} - <span class="type">${type}</span></h2>
                            ${printableSynonyms}
                        </div>
                        <div class="definitions">
                            <ul class="def-list">
                                <button class="extra-def-btn"><span = "extra-def-span">Extra Definitions</span></button>
                                <br>
                                <ul class="extra-def-ul visible">
                                    <!--space for extra defs-->
                                </ul>
                                ${printableDef}
                                ${printableSentences}
                                
                            </ul>
                        </div>
                    </div>
                `;

            if (defs.length > 0) {
                createPopup(content);
            } else {
                console.log(`No match found for ${selectedText}`);
            }
            console.log(`Extracted Text: ${selectedText}`);

        } 
}

function triggerPopupWithoutRefreshing() {
    createPopup(content);
}