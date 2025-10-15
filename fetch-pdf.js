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

async function generatePDFs() {
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
    
    // Add Reference last (without number for now, or with last number)
    if (sections['Reference']) {
      orderedSections.push({
        name: 'Reference',
        pages: sections['Reference'],
        number: orderedSections.length + 1
      });
    }
    
    console.log('\nProcessing sections in order:', orderedSections.map(s => `${s.number}. ${s.name}`).join(', '));
    
    // Ensure pdfs directory exists
    await fs.mkdir('pdfs', { recursive: true });
    
    const browser = await puppeteer.launch({ headless: 'new' });
    
    try {
      for (const sectionInfo of orderedSections) {
        const { name: section, pages, number } = sectionInfo;
        console.log(`\nProcessing ${section} section...`);
        
        const allPagesHTML = [];
        
        for (const pageInfo of pages) {
          const page = await browser.newPage();
          
          try {
            console.log(`  Fetching: ${pageInfo.title}`);
            
            // Navigate to the page
            await page.goto(pageInfo.url, { 
              waitUntil: 'networkidle2',
              timeout: 30000 
            });
            
            // Extract the main content HTML
            const pageContent = await page.evaluate(() => {
              const main = document.querySelector('main');
              if (main) {
                // Remove the learn-more div
                const learnMore = main.querySelector('.learn-more');
                if (learnMore) {
                  learnMore.remove();
                }
                
                // Remove all images
                const images = main.querySelectorAll('img');
                images.forEach(img => img.remove());
                
                // Remove any scripts
                const scripts = main.querySelectorAll('script');
                scripts.forEach(script => script.remove());
                
                return main.innerHTML;
              }
              return '';
            });
            
            if (pageContent) {
              allPagesHTML.push(pageContent);
            }
            console.log(`    ✓ Processed: ${pageInfo.title}`);
            
          } catch (error) {
            console.error(`    ✗ Error processing ${pageInfo.title}: ${error.message}`);
          } finally {
            await page.close();
          }
        }
        
        // Create combined PDF from collected HTML
        if (allPagesHTML.length > 0) {
          console.log(`  Creating combined PDF for ${section}...`);
          
          // Create a new page for combined content
          const combinedPage = await browser.newPage();
          
          // Build HTML with all pages content separated by page breaks
          let combinedHTML = '<html><head><style>@media print { .page-break { page-break-after: always; } }</style></head><body>';
          
          for (let i = 0; i < allPagesHTML.length; i++) {
            combinedHTML += `<div>${allPagesHTML[i]}</div>`;
            // Add page break except after the last page
            if (i < allPagesHTML.length - 1) {
              combinedHTML += '<div class="page-break"></div>';
            }
          }
          
          combinedHTML += '</body></html>';
          
          // Set the combined content
          await combinedPage.setContent(combinedHTML, { waitUntil: 'networkidle0' });
          
          // Generate a valid filename for the section with number
          const sanitizedSection = section
            .replace(/[^a-zA-Z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          const paddedNumber = number.toString().padStart(2, '0');
          const filename = `${paddedNumber}-${sanitizedSection}.pdf`;
          const filepath = path.join('pdfs', filename);
          
          // Generate the combined PDF
          await combinedPage.pdf({
            path: filepath,
            format: 'Letter',
            printBackground: true,
            margin: {
              top: '20mm',
              right: '20mm',
              bottom: '20mm',
              left: '20mm'
            }
          });
          
          console.log(`    ✓ Saved section PDF: ${filepath}`);
          await combinedPage.close();
        }
      }
    } finally {
      await browser.close();
    }
    
    console.log('\n✓ PDF generation complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
generatePDFs().catch(console.error);