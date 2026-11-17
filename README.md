# Winter Night

**[![Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://cary1204.github.io/winter-time/)**

Tried to use Vite and npm instead of plain html for this time, cool stuff. Have mountains, sky, moon, and a live clock. Happy Winter

Will try to remake this with React some times later.

**demo → https://cary1204.github.io/winter-time/**

<img src="screenshot.png" alt="Winter Night screenshot" width="450">



# Some stuff used

falling snow: [magic-snowflakes](https://www.npmjs.com/package/magic-snowflakes)

Build tool: [Vite](https://vite.dev)

npm: [npm](https://www.npmjs.com/)

## Requirements

- Node.js 20 or newer

## How to run

```
npm install
npm run dev
```

Opens the url displayed on the bottom

## Scripts

| Command in json   | Function                                         |
| ----------------- | -------------------------------------------------|
| `npm run dev`     | dev server                                       |
| `npm run build`   | prod in `/disc`                                  |
| `npm run preview` | local prod preview / should look the same as dev |

## Configs

| Settings                      | Locations                                               |
| ----------------------------- | --------------------------------------------------------|
| Mountains, text               | `index.html`                                            |
| Colors, fonts, fade timing    | `src/style.css` (the const on top should be fine)       |
| Clock , snow                  | `src/main.js`                                           |
