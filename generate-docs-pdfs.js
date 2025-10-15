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
    
    // Ensure pdfs directory and subdirectories exist
    for (const section of Object.keys(sections)) {
      const sectionPath = path.join('pdfs', section);
      await fs.mkdir(sectionPath, { recursive: true });
    }
    
    const browser = await puppeteer.launch({ headless: 'new' });
    
    try {
      for (const [section, pages] of Object.entries(sections)) {
        console.log(`\nProcessing ${section} section...`);
        
        for (const pageInfo of pages) {
          const page = await browser.newPage();
          
          try {
            console.log(`  Fetching: ${pageInfo.title}`);
            
            // Navigate to the page
            await page.goto(pageInfo.url, { 
              waitUntil: 'networkidle2',
              timeout: 30000 
            });
            
            // Extract only the main content and remove learn-more div and images
            await page.evaluate(() => {
              // Keep only the main element
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
                
                // Replace the entire body with just the main content
                document.body.innerHTML = '';
                document.body.appendChild(main);
                
                // Remove any scripts that might interfere
                const scripts = document.querySelectorAll('script');
                scripts.forEach(script => script.remove());
              }
            });
            
            // Generate a valid filename with 2-digit index number
            const pageIndex = pages.indexOf(pageInfo) + 1;
            const paddedIndex = pageIndex.toString().padStart(2, '0');
            const sanitizedTitle = pageInfo.title
              .replace(/[^a-zA-Z0-9]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
            const filename = `${paddedIndex}-${sanitizedTitle}.pdf`;
            
            const filepath = path.join('pdfs', section, filename);
            
            // Generate PDF
            await page.pdf({
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
            
            console.log(`    ✓ Saved: ${filepath}`);
            
          } catch (error) {
            console.error(`    ✗ Error processing ${pageInfo.title}: ${error.message}`);
          } finally {
            await page.close();
          }
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