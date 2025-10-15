const fs = require('fs').promises;
const path = require('path');

// Function to fetch content from URL
async function fetchContent(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
}

// Function to parse simple YAML (enough for the topics structure)
function parseTopicsYaml(yamlContent) {
  const sections = {};
  let currentSection = null;

  const lines = yamlContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Section header (e.g., "essentials:")
    if (trimmed.endsWith(':') && !trimmed.startsWith('-')) {
      currentSection = trimmed.slice(0, -1);
      sections[currentSection] = [];
    }
    // Page entry (e.g., "- Why Nue")
    else if (trimmed.startsWith('- ') && currentSection) {
      const pageEntry = trimmed.slice(2);
      const parsed = parseEntry(pageEntry);
      sections[currentSection].push(parsed);
    }
  }

  return sections;
}

// Function to parse entry exactly like the website does (from topics.js)
function parseEntry(el) {
  const [content, explicitSlug] = el.split(' | ');

  // Split content by / to separate title and desc
  const [title, desc = ''] = content.split(' / ');

  // Use explicit slug or generate from title
  const slug = explicitSlug || title.toLowerCase().replaceAll(' ', '-');

  return { title: title.trim(), desc: desc.trim(), slug: slug.trim() };
}

async function generateBookMarkdown() {
  try {
    console.log('Fetching topics structure from GitHub...');

    // Fetch the topics YAML structure
    const topicsUrl = 'https://raw.githubusercontent.com/nuejs/nue/refs/heads/master/packages/www/%40shared/data/topics.yaml';
    const yamlContent = await fetchContent(topicsUrl);

    if (!yamlContent) {
      throw new Error('Failed to fetch topics structure');
    }

    // Parse the YAML to get sections and pages
    const sections = parseTopicsYaml(yamlContent);
    console.log('\nFound sections:', Object.keys(sections).join(', '));

    // Define section order and numbering (matching our previous approach)
    const sectionOrder = [
      'essentials',
      'tools',
      'developing',
      'concepts'
    ];

    // Create ordered sections list
    const orderedSections = [];

    // Add numbered sections in order (without numbers yet)
    sectionOrder.forEach((sectionKey) => {
      if (sections[sectionKey]) {
        orderedSections.push({
          key: sectionKey,
          name: sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1),
          pages: sections[sectionKey]
        });
      }
    });

    // Add any other sections (except reference and topics) after the numbered ones
    Object.keys(sections).forEach(sectionKey => {
      if (!sectionOrder.includes(sectionKey) && sectionKey !== 'reference' && sectionKey !== 'topics') {
        orderedSections.push({
          key: sectionKey,
          name: sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1),
          pages: sections[sectionKey]
        });
      }
    });

    // Add reference last
    if (sections['reference']) {
      orderedSections.push({
        key: 'reference',
        name: 'Reference',
        pages: sections['reference']
      });
    }

    console.log('\nProcessing sections in order:', orderedSections.map(s => s.name).join(', '));

    // Ensure markdown directory exists
    await fs.mkdir('markdown', { recursive: true });

    // Don't generate a manual TOC - let pandoc handle it automatically
    // This ensures proper linking in the EPUB

    // Process each section with dynamic numbering
    let chapterNumber = 0;
    for (const sectionInfo of orderedSections) {
      const { key: sectionKey, name: section, pages } = sectionInfo;

      // Skip empty sections or the topics grouping section
      if (sectionKey === 'topics') continue;
      if (!pages || pages.length === 0) {
        console.log(`\nSkipping empty ${section} section`);
        continue;
      }

      // Increment chapter number only when we actually process a section
      chapterNumber++;

      console.log(`\nProcessing ${section} section...`);

      // Start new chapter markdown with dynamic numbering
      let sectionMarkdown = `# ${chapterNumber}. ${section}\n\n`;

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = pages[pageIndex];
        const pageTitle = page.title;
        const pageSlug = page.slug;

        console.log(`  Fetching: ${pageTitle} (${pageSlug})`);

        // Fetch the markdown content from GitHub
        const mdUrl = `https://raw.githubusercontent.com/nuejs/nue/refs/heads/master/packages/www/docs/${pageSlug}.md`;
        const pageContent = await fetchContent(mdUrl);

        if (pageContent) {
          const sectionNumber = `${chapterNumber}.${pageIndex + 1}`;

          // Add page header
          sectionMarkdown += `## ${sectionNumber} ${pageTitle}\n\n`;

          // Process the markdown content:
          // - Skip any existing # headers
          // - Demote all other headers by one level (## becomes ###, ### becomes ####, etc.)
          const cleanContent = pageContent
            .split('\n')
            .map(line => {
              if (line.startsWith('# ')) {
                return ''; // Skip top-level headers
              } else if (line.match(/^#{2,6} /)) {
                // Demote headers by adding one more #
                return '#' + line;
              }
              return line;
            })
            .filter(line => line !== null)
            .join('\n');

          sectionMarkdown += cleanContent + '\n\n';

          // Add page break if not the last page
          if (pageIndex < pages.length - 1) {
            sectionMarkdown += '\\newpage\n\n';
          }

          console.log(`    ✓ Processed: ${pageTitle}`);
        } else {
          console.error(`    ✗ Failed to fetch: ${pageTitle}`);
        }
      }

      // Save chapter markdown
      const chapterPath = path.join('markdown', `chapter-${chapterNumber.toString().padStart(2, '0')}-${sectionKey}.md`);
      await fs.writeFile(chapterPath, sectionMarkdown, 'utf8');
      console.log(`  ✓ Saved chapter: ${chapterPath}`);
    }

    console.log('\n✓ Markdown generation complete!');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
generateBookMarkdown().catch(console.error);
