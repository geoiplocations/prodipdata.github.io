# GeoIP Locations — static website package v2

This package is a GitHub Pages-ready static website for **GeoIP Locations**, the public website brand of **ProdIPData**.

## Included pages

- `index.html`
- `platform.html`
- `coverage.html`
- `methodology.html`
- `downloads.html`
- `contact.html`
- `licensing.html`
- `404.html`

## Included assets

- `assets/css/styles.css`
- `assets/js/site.js`
- `assets/data/releases.json`
- `assets/data/coverage-sample.json`
- `.nojekyll`

## How to test locally

The pages will open directly in a browser, but some browsers block `fetch()` requests to local JSON files when the site is opened with the `file://` protocol.

Two easy options:

### Option 1 — simplest preview
Open `index.html` directly in the browser. The layout will load, but the JSON-driven sections may stay empty depending on browser rules.

### Option 2 — recommended local preview
Run a tiny local web server from this folder. For example with Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## How to publish on GitHub Pages

1. Create or open your GitHub repository.
2. Upload all files from this folder to the repository root.
3. In repository settings, enable **Pages**.
4. Publish from the main branch root.

## Monthly update model

The layout is separated from the data. For routine monthly refreshes, you can update:

- `assets/data/releases.json`
- `assets/data/coverage-sample.json`

Later, those files can be generated automatically from your ProdIP export process.


## Dataset licensing

Unless otherwise stated, published datasets and metadata are licensed under **CC BY 4.0**. See `licensing.html` and `LICENSE-DATA.md`.
