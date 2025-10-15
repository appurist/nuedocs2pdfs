# nuedocs2pdfs
A Node.js script that extracts documentation from https://nuejs.org/docs/ and generates organized PDFs in a folder tree structure.

## Purpose
This tool automatically fetches the Nue.js documentation website and converts each page into a PDF file, organizing them by section for offline reading or archival purposes.

## Installation
```bash
bun install
```

## Usage

### Generate Individual PDFs (one per page)
```bash
bun pages
# or directly:
bun generate-pages-pdfs.js
```

Creates a folder structure with individual PDFs:
```
pdfs/
├── Section1/
│   ├── 01-Page-Title.pdf
│   └── 02-Another-Page.pdf
└── Section2/
    └── 01-Page.pdf
```

### Generate Section PDFs (one per section)
```bash
bun sections
# or directly:
bun generate-sections-pdfs.js
```

Creates one PDF per documentation section with page breaks between topics:
```
pdfs/
├── Getting-Started.pdf
├── Concepts.pdf
└── Reference.pdf
```

### Clean Output
```bash
bun run clean
```
Removes the `pdfs` output directory.

## Output Details

Each PDF:
- Contains only the main content (images and navigation elements are removed)
- Uses Letter format with 20mm margins
- Individual PDFs have numbered prefixes for easy ordering
- Section PDFs include page breaks between each documentation page

## Requirements
- Bun runtime
- Internet connection to fetch documentation from nuejs.org
