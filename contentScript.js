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

    document.body.appendChild(popup);
    postionPopup(popup);
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
        const dict = await getDefinition(selectedText); 
        if (dict.length === 0) {
            wordFound = false;
            return;
        } else {
            wordFound = true;
        }
        for (let entry of dict) {

            let synHtml = entry.synonym.map(s => `<span class="synonym">${s}</span>`).join("");
            let defHtml = entry.definition.map((d, i) => {
                const sentence = entry.sentence[i] ? `<span class="sentence">${entry.sentence[i]}</span>` : "";
                return `<li class="def-item">${d}${sentence}</li>`
            }).join("");    

            // let defs = entry.definition;
            // formatting definitions
            // let printableDef = "";

            // for (let def of defs) {
            //     printableDef += `<li class="def">${def}</li><br>`;
            // }

            // let sentences = entry.sentence;
            // // formatting sentences
            // let printableSentences = "";
            // if (!(typeof(sentences) === 'string')) {
            //     for (let sentence of sentences) {
            //         printableSentences += `<li class="sentence">"${sentence}"</li><br>`;
            //     }
            // } else {
            //     printableSentences += 'No sentences available';
            // }

            let type = entry.type;

            // formatting synonyms
            // let synonyms = entry.synonym;
            // let printableSynonyms = "";
            // if (synonyms.length > 0) {
            //     let cnt = 0;
            //     for (syn of synonyms) {
            //         printableSynonyms += `<h3 class="synonym">${syn} </h3>`;
            //     }
            // }

            content += `
                <div class="wrapper">
                    <div class="word-header">
                        <span class="word">${selectedText}</span>
                        <span class="type">${type}</span>
                    </div>
                    <div class="syn-container">${synHtml}</div>
                    <ul class="def-list">${defHtml}</ul>
                    <div class="extra-def-btn">▶ Extra Definitions</div>
                    <ul class="extra-def-ul visible>
                    </ul>
                </div>
            `;

            // content += `
            //         <div class="wrapper">
            //             <div class="main">
            //                 <h2 class="word">${selectedText} - <span class="type">${type}</span></h2>
            //                 <p class="syn-title"><i>Synonyms</i></p> ${printableSynonyms}
                            
            //             </div>
            //             <div class="definitions">
            //                 <ul class="def-list">
            //                 ${printableDef}
            //                 ${printableSentences}
                            
            //                 </ul>
            //                 <li class="extra-def-btn"><span = "extra-def-span">▶ Show Extra</span></li>
            //                 <br>
            //                 <ul class="extra-def-ul visible">
            //                     <ul class="def-list">
            //                         <!--space for extra defs-->
            //                     </ul>
            //                 </ul>
            //             </div>
            //         </div>
            //     `;

            createPopup(content);
            // will decide if i want to un-comment this
            // if (defs.length > 0) {
            // } else {
            //     console.log(`No match found for ${selectedText}`);
            // }
            // console.log(`Extracted Text: ${selectedText}`);

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
            left = window.innerWidth - 370;
        } 

        popupElement.style.top = `${top}px`;
        popupElement.style.left = `${left}px`;

    }
}