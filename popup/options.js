// global save button
const saveBtn = document.getElementById('saveBtn');

async function loadDecks() {
    const select = document.getElementById('deckSelect');
    try {
        saveBtn.disabled = false;

        const decks = await getDecks();
        console.log(decks);
        select.innerHTML = '';
        // add option elements
        decks.forEach((deck) => {
            const opt = document.createElement('option');
            opt.value = deck;
            opt.textContent = deck;
            select.appendChild(opt);
        });

        // selects previously selected deck or default if not selected already
        const result = await browser.storage.local.get({selectedDeck: 'Default'});
        if (decks.includes(result.selectedDeck)) {
            select.value = result.selectedDeck;
        }
    } catch (error) {
        select.innerHTML = '<option disabled selected>Error: is Anki Open?</option>';
        saveBtn.disabled = true;
    }
}

async function loadNoteTypes() {
    const select = document.getElementById('noteTypeSelect');
    try {
        const modelNames = await getNoteTypes();
        select.innerHTML = '';
        // add option elements
        modelNames.forEach(model => {
            const opt = document.createElement('option');
            opt.value = model;
            opt.textContent = model;
            select.appendChild(opt);
        });
        // selects previously selected noteType or Basic if not selected already
        const models = await browser.storage.local.get({selectedModel: 'Basic'});
        if (modelNames.includes(models.selectedModel)) {
            select.value = models.selectedModel;
        }
    } catch (e) {
        console.error(`Error occured while loading note types ${e}`);
        saveBtn.disabled = true;
    }
}

async function loadFields() {
    const fieldContainer = document.getElementById('field-div');
    const selectedModel = document.getElementById('noteTypeSelect').value;

    // doing this before saving so the fields appear accordingly, not just when 
    // the save button is clicked
    await browser.storage.local.set({ selectedModel });

    try {
        const fields = await ankiConnectInvoke('modelFieldNames', 5, {
            modelName: selectedModel
        });

        fieldContainer.innerHTML = '<h3>Field Mapping</h3>'; // clears old field as well

        // prepopulate in case already selected once
        const storage = await browser.storage.local.get({ fieldMapping: {} });
        const currentMapping = storage.fieldMapping[selectedModel] || {};

        fields.forEach(field => {
            const row = document.createElement('div');
            row.className = 'field-row';
            row.innerHTML = `
                <label>${field}:</label>
                <input type="text" 
                class="field-input" 
                data-field="${field}" 
                value="${currentMapping[field] || ''}" 
                placeholder="{word}, {definition}, etc.">
            `;
            fieldContainer.appendChild(row);
        })
    } catch(e) {
        console.error("Error loading fields: ", e);
    }

}
loadDecks();
loadNoteTypes();

document.getElementById('noteTypeSelect').addEventListener('change', loadFields);





document.getElementById('saveBtn').addEventListener('click', async () => {
    const deck = document.getElementById('deckSelect').value;
    const model = document.getElementById('noteTypeSelect').value;

    const fieldMapping = {};
    document.querySelectorAll('.field-input').forEach(input => {
        fieldMapping[input.dataset.field] = input.value;
    });
    const storage = await browser.storage.local.get({ allMappings: {} });
    storage.allMappings[model] = fieldMapping;

    await browser.storage.local.set({
        selectedDeck: deck,
        selectedModel: model,
        allMappings: storage.allMappings
    });
    alert('Settings Saved!');
});

