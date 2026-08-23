# Wisconsin Aerial

A Vite + React + Tailwind app for the Wisconsin Aerial site progress dashboard, client portal, and comparison tools.

## Run it locally

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

## Build for production

```bash
npm run build
```

This outputs a static site to `dist/`. Preview the production build with:

```bash
npm run preview
```

## Deploy

The `dist/` folder is plain static HTML/JS/CSS, so it can be deployed to:

- **Vercel / Netlify** — connect the GitHub repo and they'll auto-detect Vite (`npm run build`, output directory `dist`).
- **GitHub Pages** — run `npm run build`, then publish the contents of `dist/` to a `gh-pages` branch (e.g. using the `gh-pages` npm package or a GitHub Actions workflow).
- Any static host — just upload the `dist/` folder.

## Project structure

```
wisconsin-aerial/
├── index.html            # Vite entry HTML
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx           # React root render
    ├── index.css          # Tailwind directives
    └── App.jsx            # Main application component
```
