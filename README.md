# Kiroku

Kiroku is a browser extension for quick word lookup and Anki note creation.
It was inspired by [Yomitan](https://github.com/yomidevs/yomitan), a popular browser-based dictionary extension used for language learning.

This project keeps the core idea of fast popup lookups and adapts it into a smaller custom extension with local dictionary data and Anki integration.

## Features

- Lookup definitions by selecting a word and pressing `Ctrl` / `Cmd`
- Show a popup with the word, part of speech, definitions, synonyms, and example sentences
- Cache dictionary lookups for faster repeat access
- Add expressions directly to Anki through AnkiConnect
- Detect duplicate notes and show a warning inside the popup
- Store deck, note type, and field mappings in the options page
- Use a local dictionary dataset for offline-friendly lookups

## Technologies Used

- JavaScript
- HTML
- CSS
- Chrome / Edge Extension Manifest V3
- [Dexie.js](https://dexie.org/) for IndexedDB access
- [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) for extension APIs
- [AnkiConnect](https://foosoft.net/projects/anki-connect/) for sending notes to Anki

## Project Structure

- `src/content/` - content script that handles popup lookup behavior
- `src/background/` - service worker that handles dictionary and Anki messages
- `src/shared/` - shared Anki helper logic
- `src/styles/` - popup styling
- `src/vendor/` - vendored browser polyfill and Dexie build
- `popup/` - popup and options UI
- `dict/` - dictionary data files

## Setup

1. Open Anki and make sure the AnkiConnect add-on is installed and running.
2. Load the extension as an unpacked extension in your browser.
3. Open the extension options page and choose your deck, note type, and field mappings.
4. Select a word on a page and press `Ctrl` / `Cmd` to open the lookup popup.

### CRUCIAL FOR ANKI INTEGRATION
Kiroku needs to know if your Anki is open or not. For that you need to install the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) addon. After you're done installing restart Anki to make sure your local server is running.

After you've done that go ahead and import the apkg file included in the assets folder of the extension. In it is an example word deck which you can delete after importing (or keep. Up to you really). The purpose of the deck is to install my custom made note type for this extension. You can also use your own note types but make sure to include an id field else the add button and lookup button feature won't work.

Now open Anki and then click on the extension icon in your extension toolbar and navigate to settings.
<img width="468" height="289" alt="image" src="https://github.com/user-attachments/assets/69491070-37a1-4ce0-a8a6-4108d408e76b" />

After that, select the deck you wish to add the cards to and select either the English Mining Note notetype or your custom note type (again make sure you have an id field), fill the fields with your preferred values and hit save.

<img width="2590" height="1285" alt="image" src="https://github.com/user-attachments/assets/1edafe37-d261-470c-9ad5-06da79dcc7dd" />

### You're done!

Congratulations. You should be able to seamlessly add flashcards to your anki app now. 

This is a project I started back in highschool and the repository has been evolving over time. Consequently there might still be a lot of mistakes in the code that can cause confusing bugs so if you find any issues please do reach out.


## Demo Video
https://github.com/user-attachments/assets/e3987388-e1b8-4e34-86b8-22d69b452ffe

## Notes

- The selected word works best when it matches an entry in the dictionary data.
- The popup and Anki integration depend on AnkiConnect being available locally.



