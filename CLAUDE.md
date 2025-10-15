# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose
This is a Node.js script that extracts documentation from https://nuejs.org/docs/ and generates organized PDFs in a folder tree structure.

## Commands

### Installation
```bash
bun install
```

### Generate PDFs
```bash
bun start
# or directly:
bun generate-docs-pdfs.js
```

### Clean Output
```bash
bun run clean
```
Removes the `pdfs` output directory.

## Architecture

### Main Script: `generate-docs-pdfs.js`
The script uses Puppeteer to:
1. **Fetch documentation structure** (`fetchDocsSections()`): Navigates to nuejs.org/docs and extracts the section hierarchy from the `.topics` div
2. **Generate PDFs** (`generatePDFs()`): 
   - Creates folder structure under `pdfs/` matching documentation sections
   - For each page, removes unnecessary elements (learn-more div, images, scripts)
   - Generates PDFs with numbered filenames (e.g., `01-Getting-Started.pdf`)

### Output Structure
PDFs are organized by section in the `pdfs/` directory:
```
pdfs/
├── Section1/
│   ├── 01-Page-Title.pdf
│   └── 02-Another-Page.pdf
└── Section2/
    └── 01-Page.pdf
```

### Dependencies
- `puppeteer`: Web scraping and PDF generation