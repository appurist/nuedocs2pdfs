# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose
This is a Node.js script that extracts documentation from https://nuejs.org/docs/ and generates organized PDFs in a folder tree structure.

## Commands

### Installation
```bash
bun install
```

### Generate Individual PDFs (one per page)
```bash
bun pages
# or directly:
bun generate-pages-pdfs.js
```

### Generate Section PDFs (one per section)
```bash
bun sections
# or directly:
bun generate-sections-pdfs.js
```

### Clean Output
```bash
bun run clean
```
Removes the `pdfs` output directory.

## Architecture

### Script: `generate-pages-pdfs.js`
Generates individual PDFs for each documentation page:
1. **Fetch documentation structure** (`fetchDocsSections()`): Navigates to nuejs.org/docs and extracts the section hierarchy from the `.topics` div
2. **Generate PDFs** (`generatePDFs()`): 
   - Creates folder structure under `pdfs/` matching documentation sections
   - For each page, removes unnecessary elements (learn-more div, images, scripts)
   - Generates PDFs with numbered filenames (e.g., `01-Getting-Started.pdf`)

Output structure:
```
pdfs/
├── Section1/
│   ├── 01-Page-Title.pdf
│   └── 02-Another-Page.pdf
└── Section2/
    └── 01-Page.pdf
```

### Script: `generate-sections-pdfs.js`
Generates one PDF per documentation section:
1. **Fetch documentation structure** (`fetchDocsSections()`): Same as above
2. **Generate PDFs** (`generatePDFs()`):
   - Creates `pdfs/` directory
   - For each section, fetches all pages and combines them into a single PDF
   - Adds CSS page breaks between each documentation page
   - Generates section PDFs (e.g., `Getting-Started.pdf`)

Output structure:
```
pdfs/
├── Getting-Started.pdf
├── Concepts.pdf
└── Reference.pdf
```

### Dependencies
- `puppeteer`: Web scraping and PDF generation