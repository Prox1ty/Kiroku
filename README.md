# Yomitan Replica

Yomitan Replica is a browser extension for quick word lookup and Anki note creation.
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

```html
<video controls width="100%">
	<source src="assets/demovideo.mp4" type="video/mp4">
	Your browser does not support the video tag.
</video>
```

## Notes

- The selected word works best when it matches an entry in the dictionary data.
- The popup and Anki integration depend on AnkiConnect being available locally.



