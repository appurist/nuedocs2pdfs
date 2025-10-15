# nuedocs2pdfs
A Node.js script that extracts documentation from https://nuejs.org/docs/ and generates organized PDFs in a folder tree structure.

## Purpose
This tool automatically fetches the Nue.js documentation website and converts each page into a PDF file, organizing them by section for offline reading or archival purposes.

## Installation
```bash
bun install
```

## Usage

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

## Output Structure
The generated PDFs are organized by documentation section:
```
pdfs/
├── Section1/
│   ├── 01-Page-Title.pdf
│   └── 02-Another-Page.pdf
└── Section2/
    └── 01-Page.pdf
```

Each PDF:
- Has a numbered prefix for easy ordering
- Contains only the main content (images and navigation elements are removed)
- Uses Letter format with 20mm margins

## Requirements
- Bun runtime
- Internet connection to fetch documentation from nuejs.org
