#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'fs';

// Map of doc page slugs to section titles in our combined document
const linkMap = {
  // From chapter 1 - Essentials
  'why-nue': 'Why Nue',
  'getting-started': 'Getting started', 
  'migration': 'Migration',
  'roadmap': 'Roadmap',
  'contributing': 'Contributing',
  
  // From chapter 2 - Tools
  'nuekit': 'Nuekit',
  'nuedom': 'Nuedom',
  'nuestate': 'Nuestate',
  'nuemark': 'Nuemark',
  'nueserver': 'Nueserver',
  'nueglow': 'Nueglow',
  'nueyaml': 'Nueyaml',
  
  // From chapter 3 - Developing
  'project-structure': 'Project structure',
  'website-development': 'Website development',
  'css-development': 'CSS development',
  'interactive-components': 'Interactive components',
  'js-enhancements': 'JS enhancements',
  'svg-development': 'SVG development',
  'spa-development': 'SPA development',
  
  // From chapter 4 - Concepts
  'minimalism': 'Minimalism',
  'separation-of-concerns': 'Separation of concerns',
  'design-systems': 'Design systems',
  'design-engineering': 'Design engineering',
  'universal-data-model': 'Universal data model',
  
  // From chapter 5 - Reference
  'configuration': 'Configuration',
  'cli': 'Command line (CLI)',
  'build-system': 'Build system',
  'html-file-types': 'HTML file types',
  'html-syntax': 'HTML syntax',
  'layout-system': 'Layout system',
  'page-dependencies': 'Page dependencies',
  'template-data': 'Template data',
  'state-api': 'State API',
  'server-api': 'Server API',
  'nuemark-syntax': 'Nuemark syntax',
  'yaml-syntax': 'YAML syntax',
  'syntax-highlighting': 'Syntax highlighting',
  
  // Special cases - these either don't exist in our docs or have different names
  'edge-first': 'Nueserver', // Closest match - edge concepts in server section
  'server-development': 'SPA development', // Server discussion is in SPA section  
  'single-page-apps': 'SPA development', // Same as spa-development
  'examples/nue-counter': null // External demo - leave as is
};

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Replace multiple hyphens with single
    .trim('-');                   // Remove leading/trailing hyphens
}

function fixInternalLinks(htmlContent) {
  // Replace internal doc links with anchor links or external nuejs.org links
  let content = htmlContent;
  
  // Handle /docs/ links
  content = content.replace(/href="\/docs\/([^"]+)"/g, (match, slug) => {
    const target = linkMap[slug];
    if (target === null) {
      // Explicitly marked to convert to external link
      return `href="https://nuejs.org/docs/${slug}"`;
    } else if (target) {
      const anchor = slugify(target);
      return `href="#${anchor}"`;
    }
    // If we don't have a mapping, convert to external nuejs.org link
    return `href="https://nuejs.org/docs/${slug}"`;
  });
  
  // Handle file:// links that reference docs
  content = content.replace(/href="file:\/\/\/[^"]*\/([^/"]+)"/g, (match, slug) => {
    const target = linkMap[slug];
    if (target === null) {
      // Explicitly marked to convert to external link
      return `href="https://nuejs.org/docs/${slug}"`;
    } else if (target) {
      const anchor = slugify(target);
      return `href="#${anchor}"`;
    }
    // If we don't have a mapping, convert to external nuejs.org link
    return `href="https://nuejs.org/docs/${slug}"`;
  });
  
  return content;
}

// Read the HTML file
const htmlFile = process.argv[2] || 'learning-nue.html';

try {
  console.log(`Fixing internal links in ${htmlFile}...`);
  
  const htmlContent = readFileSync(htmlFile, 'utf8');
  const fixedContent = fixInternalLinks(htmlContent);
  
  // Count how many links were processed
  const originalDocsLinks = (htmlContent.match(/href="\/docs\/[^"]+"/g) || []).length;
  const originalFileLinks = (htmlContent.match(/href="file:\/\/\/[^"]*\/[^/"]+"/g) || []).length;
  const originalLinks = originalDocsLinks + originalFileLinks;
  
  const remainingDocsLinks = (fixedContent.match(/href="\/docs\/[^"]+"/g) || []).length;
  const remainingFileLinks = (fixedContent.match(/href="file:\/\/\/[^"]*\/[^/"]+"/g) || []).length;
  const remainingInternalLinks = remainingDocsLinks + remainingFileLinks;
  
  const externalLinks = (fixedContent.match(/href="https:\/\/nuejs\.org\/docs\/[^"]+"/g) || []).length;
  const anchorLinks = (fixedContent.match(/href="#[^"]+"/g) || []).length - 
                     (htmlContent.match(/href="#[^"]+"/g) || []).length; // Subtract existing anchors
  
  writeFileSync(htmlFile, fixedContent, 'utf8');
  
  console.log(`✓ Processed ${originalLinks} internal links:`);
  if (anchorLinks > 0) {
    console.log(`  - ${anchorLinks} converted to internal anchors`);
  }
  if (externalLinks > 0) {
    console.log(`  - ${externalLinks} converted to external nuejs.org links`);
  }
  if (remainingInternalLinks > 0) {
    console.log(`  ⚠ ${remainingInternalLinks} links still unmapped`);
  }
  
} catch (error) {
  console.error('Error fixing links:', error.message);
  process.exit(1);
}