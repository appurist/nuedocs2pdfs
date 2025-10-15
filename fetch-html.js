const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function fetchDocsSections() {
  console.log('Fetching documentation structure from nuejs.org/docs...');
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://nuejs.org/docs/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Extract sections from the topics div
    const sections = await page.evaluate(() => {
      const topicsDiv = document.querySelector('.topics');
      if (!topicsDiv) {
        throw new Error('Could not find .topics div');
      }
      
      const sectionsData = {};
      
      // Get all h3 elements within topics
      const h3Elements = topicsDiv.querySelectorAll('h3');
      
      h3Elements.forEach(h3 => {
        // Get the section ID from h3
        const sectionId = h3.id;
        if (!sectionId) return;
        
        // Find the next sibling that is a nav.stack
        let nextElement = h3.nextElementSibling;
        while (nextElement && !nextElement.matches('nav.stack')) {
          nextElement = nextElement.nextElementSibling;
        }
        
        if (nextElement && nextElement.matches('nav.stack')) {
          // Extract all links from the nav
          const links = nextElement.querySelectorAll('a');
          const pages = Array.from(links).map(link => ({
            title: link.textContent.trim(),
            url: link.href
          }));
          
          if (pages.length > 0) {
            // Use the h3 text content as the section name, or fallback to ID
            const sectionName = h3.textContent.trim() || sectionId;
            sectionsData[sectionName] = pages;
          }
        }
      });
      
      return sectionsData;
    });
    
    await browser.close();
    return sections;
    
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function generateBookHTML() {
  try {
    // Fetch the current documentation structure
    const sections = await fetchDocsSections();
    
    console.log('\nFound sections:', Object.keys(sections).join(', '));
    
    // Define section order and numbering
    const sectionOrder = [
      'Essentials',
      'Tools', 
      'Developing',
      'Concepts'
    ];
    
    // Create ordered sections list
    const orderedSections = [];
    
    // Add numbered sections in order
    sectionOrder.forEach((sectionName, index) => {
      if (sections[sectionName]) {
        orderedSections.push({
          name: sectionName,
          pages: sections[sectionName],
          number: index + 1
        });
      }
    });
    
    // Add any other sections (except Reference) after the numbered ones
    Object.keys(sections).forEach(sectionName => {
      if (!sectionOrder.includes(sectionName) && sectionName !== 'Reference') {
        orderedSections.push({
          name: sectionName,
          pages: sections[sectionName],
          number: orderedSections.length + 1
        });
      }
    });
    
    // Add Reference last
    if (sections['Reference']) {
      orderedSections.push({
        name: 'Reference',
        pages: sections['Reference'],
        number: orderedSections.length + 1
      });
    }
    
    console.log('\nProcessing sections in order:', orderedSections.map(s => `${s.number}. ${s.name}`).join(', '));
    
    // Ensure html directory exists
    await fs.mkdir('html', { recursive: true });
    
    const browser = await puppeteer.launch({ headless: 'new' });
    
    try {
      // Common CSS for all files
      const commonCSS = `<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
h1 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
h2 { color: #1f2937; margin-top: 2em; }
h3 { color: #374151; }
code { background: #f3f4f6; padding: 2px 4px; border-radius: 3px; }
pre { background: #f3f4f6; padding: 1em; border-radius: 6px; overflow-x: auto; }
blockquote { border-left: 4px solid #e5e7eb; margin: 1em 0; padding-left: 1em; color: #6b7280; }
.section-break { page-break-before: always; margin-top: 3em; }
article { page-break-inside: avoid; }
section { break-inside: avoid-page; }
.toc { page-break-after: always; }
.toc ul { list-style: none; padding-left: 0; }
.toc ul ul { padding-left: 10px; }
.toc li { margin: 5px 0; }
.toc a { text-decoration: none; color: #374151; }
.toc a:hover { color: #2563eb; }
</style>`;

      // Generate Table of Contents content
      let tocContent = '';
      orderedSections.forEach(sectionInfo => {
        const { name: section, pages, number } = sectionInfo;
        tocContent += `  <li><a href="#section${number}">${number}. ${section}</a>
    <ul>
`;
        pages.forEach((pageInfo, pageIndex) => {
          const sectionNumber = `${number}.${pageIndex + 1}`;
          tocContent += `      <li><a href="#page${number}-${pageIndex + 1}">${sectionNumber} ${pageInfo.title}</a></li>
`;
        });
        tocContent += `    </ul>
  </li>
`;
      });

      let pageCounter = 0;
      let idCounter = 0;
      const chapterFiles = [];
      
      for (let i = 0; i < orderedSections.length; i++) {
        const sectionInfo = orderedSections[i];
        const { name: section, pages, number } = sectionInfo;
        console.log(`\nProcessing ${section} section...`);
        
        // Start new chapter HTML
        let sectionContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${number}. ${section}</title>
${commonCSS}
</head>
<body>
<h1 id="section${number}">${number}. ${section}</h1>
`;
        
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
          const pageInfo = pages[pageIndex];
          pageCounter++;
          const page = await browser.newPage();
          
          try {
            console.log(`  Fetching: ${pageInfo.title} (${pageInfo.url})`);
            
            // Navigate to the page
            await page.goto(pageInfo.url, { 
              waitUntil: 'networkidle2',
              timeout: 30000 
            });
            
            // Create a unique page-specific prefix for IDs using URL path + counter
            const urlPath = new URL(pageInfo.url).pathname;
            const basePage = urlPath
              .replace(/^\/docs\//, '') // Remove /docs/ prefix
              .replace(/\/$/, '') // Remove trailing slash
              .replace(/\//g, '-') // Replace slashes with dashes
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '') || 'page';
            
            // Add counter to ensure absolute uniqueness
            const pagePrefix = `page${pageCounter.toString().padStart(2, '0')}-${basePage}`;
            
            console.log(`    Using prefix: ${pagePrefix}`);
            
            // Extract the main content HTML
            const pageContent = await page.evaluate((startingIdCounter) => {
              const main = document.querySelector('main');
              if (main) {
                // Remove the learn-more div
                const learnMore = main.querySelector('.learn-more');
                if (learnMore) {
                  learnMore.remove();
                }
                
                // Remove all images (pandoc handles them differently)
                const images = main.querySelectorAll('img');
                images.forEach(img => img.remove());
                
                // Remove any scripts
                const scripts = main.querySelectorAll('script');
                scripts.forEach(script => script.remove());
                
                // Simply replace all IDs with unique counters
                const elementsWithIds = main.querySelectorAll('[id]');
                let currentIdCounter = startingIdCounter;
                
                elementsWithIds.forEach(element => {
                  currentIdCounter++;
                  element.id = `id${currentIdCounter}`;
                });
                
                // Remove all internal links since we're not preserving ID relationships
                const links = main.querySelectorAll('a[href^="#"]');
                links.forEach(link => {
                  link.removeAttribute('href');
                });
                
                // Convert h1 to h2 to maintain hierarchy
                const h1s = main.querySelectorAll('h1');
                h1s.forEach(h1 => {
                  const h2 = document.createElement('h2');
                  h2.innerHTML = h1.innerHTML;
                  // Copy attributes including the updated id
                  Array.from(h1.attributes).forEach(attr => {
                    h2.setAttribute(attr.name, attr.value);
                  });
                  h1.parentNode.replaceChild(h2, h1);
                });
                
                // Convert h2 to h3, h3 to h4, etc.
                const h2s = main.querySelectorAll('h2');
                h2s.forEach(h2 => {
                  const h3 = document.createElement('h3');
                  h3.innerHTML = h2.innerHTML;
                  // Copy attributes including the updated id
                  Array.from(h2.attributes).forEach(attr => {
                    h3.setAttribute(attr.name, attr.value);
                  });
                  h2.parentNode.replaceChild(h3, h2);
                });
                
                return { html: main.innerHTML, finalIdCounter: currentIdCounter };
              }
              return { html: '', finalIdCounter: startingIdCounter };
            }, idCounter);
            
            // Update the global ID counter
            idCounter = pageContent.finalIdCounter;
            
            if (pageContent.html) {
              const sectionNumber = `${number}.${pageIndex + 1}`;
              // Add page break before each new page (except the first page of each section)
              const pageBreakClass = pageIndex > 0 ? ' class="section-break"' : '';
              sectionContent += `<div${pageBreakClass}>
<h2 id="page${number}-${pageIndex + 1}">${sectionNumber} ${pageInfo.title}</h2>
${pageContent.html}
</div>
`;
            }
            console.log(`    ✓ Processed: ${pageInfo.title}`);
            
          } catch (error) {
            console.error(`    ✗ Error processing ${pageInfo.title}: ${error.message}`);
          } finally {
            await page.close();
          }
        }
        
        // Close the section and save individual chapter file
        sectionContent += '</body></html>';
        const chapterPath = path.join('html', `chapter-${number.toString().padStart(2, '0')}-${section.toLowerCase().replace(/[^a-z0-9]/g, '-')}.html`);
        await fs.writeFile(chapterPath, sectionContent, 'utf8');
        console.log(`  ✓ Saved chapter: ${chapterPath}`);
        
        chapterFiles.push(chapterPath);
      }
      
      // Create Table of Contents file
      const tocHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Table of Contents</title>
${commonCSS}
</head>
<body>
<div class="toc">
<h1>Table of Contents</h1>
<ul>
${tocContent}
</ul>
</div>
</body></html>`;
      
      const tocPath = path.join('html', '00-toc.html');
      await fs.writeFile(tocPath, tocHTML, 'utf8');
      console.log(`\n✓ Saved TOC: ${tocPath}`);
      
    } finally {
      await browser.close();
    }
    
    console.log('\n✓ Book HTML generation complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
generateBookHTML().catch(console.error);