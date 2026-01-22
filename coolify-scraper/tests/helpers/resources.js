const fs = require('fs');
const path = require('path');

/**
 * Loads project data from a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {Object} Parsed project data
 */
function loadProjectsData(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContent);
}

/**
 * Gets the latest scraped data file
 * @param {string} baseDir - Base directory for the tests
 * @returns {string} Path to the latest JSON file
 */
function getLatestScrapedDataFile(baseDir) {
  const dataDir = path.join(baseDir, '..', 'scraped-data');
  const files = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('scraped-projects-data-') && f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(dataDir, f),
      time: fs.statSync(path.join(dataDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);
  
  if (files.length === 0) {
    throw new Error('No scraped projects data files found');
  }
  
  return files[0].path;
}

/**
 * Scrapes resources from a project page
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<Object>} Resources data with applications, databases, and services
 */
async function scrapeResources(page) {
  const resourcesData = await page.evaluate(() => {
    const data = {
      title: document.title,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      resourcesByCategory: {}
    };
    
    // Helper function to scrape resources under a specific heading
    const scrapeSection = (heading) => {
      const resources = [];
      const categoryName = heading.textContent.trim();
      
      // Find the next div.grid after the heading
      let nextElement = heading.nextElementSibling;
      while (nextElement) {
        if (nextElement.tagName === 'DIV' && nextElement.classList.contains('grid')) {
          // Found the grid container
          const boxes = nextElement.querySelectorAll('.coolbox.group');
          boxes.forEach(box => {
            const resource = {};
            
            // Get resource name
            const nameElement = box.querySelector('.box-title');
            if (nameElement) {
              resource.name = nameElement.textContent.trim();
            }
            
            // Get resource URL from parent link
            const linkElement = box.closest('a') || box.querySelector('a[href]');
            if (linkElement) {
              resource.url = linkElement.getAttribute('href');
            }
            
            // Get descriptions (description and FQDN)
            const descriptions = box.querySelectorAll('.box-description');
            if (descriptions.length > 0) {
              resource.description = descriptions[0]?.textContent.trim() || '';
            }
            if (descriptions.length > 1) {
              resource.fqdn = descriptions[1]?.textContent.trim() || '';
            }
            
            // Get status from badge
            const statusBadge = box.querySelector('.badge-dashboard');
            if (statusBadge) {
              if (statusBadge.classList.contains('bg-success')) {
                resource.status = 'running';
              } else if (statusBadge.classList.contains('bg-error')) {
                resource.status = 'exited';
              } else if (statusBadge.classList.contains('bg-warning')) {
                resource.status = 'warning';
              }
            }
            
            // Get tags
            const tagElements = box.closest('span')?.querySelectorAll('.tag') || [];
            resource.tags = Array.from(tagElements).map(tag => tag.textContent.trim()).filter(t => t);
            
            // Set category/type
            resource.category = categoryName;
            
            // Only add if we have name and URL
            if (resource.name && resource.url) {
              resources.push(resource);
            }
          });
          break;
        }
        
        // Stop if we hit another h2 heading
        if (nextElement.tagName === 'H2') {
          break;
        }
        
        nextElement = nextElement.nextElementSibling;
      }
      
      return resources;
    };
    
    // Find all h2 headings that are followed by a grid container
    const headings = Array.from(document.querySelectorAll('h2'));
    headings.forEach(heading => {
      let nextElement = heading.nextElementSibling;
      let hasGrid = false;
      
      // Check if this heading has a grid following it
      while (nextElement && nextElement.tagName !== 'H2') {
        if (nextElement.tagName === 'DIV' && nextElement.classList.contains('grid')) {
          hasGrid = true;
          break;
        }
        nextElement = nextElement.nextElementSibling;
      }
      
      // If this heading has a grid, scrape it
      if (hasGrid) {
        const categoryName = heading.textContent.trim();
        const resources = scrapeSection(heading);
        if (resources.length > 0) {
          data.resourcesByCategory[categoryName] = resources;
        }
      }
    });
    
    // For backward compatibility, also provide flat arrays
    data.applications = data.resourcesByCategory['Applications'] || [];
    data.databases = data.resourcesByCategory['Databases'] || [];
    data.services = data.resourcesByCategory['Services'] || [];
    
    return data;
  });
  
  return resourcesData;
}

/**
 * Saves resources data to a JSON file
 * @param {Object} data - The resources data object with all projects
 * @param {string} baseDir - Base directory for the tests
 * @returns {string} Path to the saved file
 */
function saveResourcesData(data, baseDir) {
  const dataDir = path.join(baseDir, '..', 'scraped-data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const dataPath = path.join(dataDir, `scraped-resources-data-${Date.now()}.json`);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  return dataPath;
}

/**
 * Prints resources data summary to console
 * @param {string} projectName - Name of the project
 * @param {number} appCount - Number of applications
 * @param {number} dbCount - Number of databases
 * @param {number} svcCount - Number of services
 */
function printResourcesSummary(projectName, appCount, dbCount, svcCount) {
  console.log(`  Project: ${projectName}`);
  console.log(`    Applications: ${appCount}, Databases: ${dbCount}, Services: ${svcCount}`);
}

module.exports = {
  loadProjectsData,
  getLatestScrapedDataFile,
  scrapeResources,
  saveResourcesData,
  printResourcesSummary
};
