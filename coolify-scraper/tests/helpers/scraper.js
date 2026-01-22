const fs = require('fs');
const path = require('path');

/**
 * Scrapes all projects from the Coolify dashboard
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<Object>} Scraped data object with projects array
 */
async function scrapeProjects(page) {
  const scrapedData = await page.evaluate(() => {
    const data = {
      title: document.title,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      projects: []
    };
    
    // Find all project boxes
    const projectBoxes = document.querySelectorAll('.coolbox.group');
    
    projectBoxes.forEach(box => {
      const project = {};
      
      // Get project title
      const titleElement = box.querySelector('.box-title');
      if (titleElement) {
        project.title = titleElement.textContent.trim();
      }
      
      // Get project description/status
      const descriptionElement = box.querySelector('.box-description');
      if (descriptionElement) {
        project.description = descriptionElement.textContent.trim();
      }
      
      // Get project URL
      const linkElement = box.querySelector('a[href]');
      if (linkElement) {
        project.url = linkElement.getAttribute('href');
      }
      
      // Only add if we have both title and URL
      if (project.title && project.url) {
        data.projects.push(project);
      }
    });
    
    return data;
  });
  
  return scrapedData;
}

/**
 * Saves scraped data to a JSON file
 * @param {Object} data - The data object to save
 * @param {string} baseDir - Base directory for the tests
 * @returns {string} Path to the saved file
 */
function saveScrapedData(data, baseDir) {
  const dataDir = path.join(baseDir, '..', 'scraped-data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const dataPath = path.join(dataDir, `scraped-projects-data-${Date.now()}.json`);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  return dataPath;
}

/**
 * Prints scraped data summary to console
 * @param {Object} data - The scraped data object
 */
function printScrapedDataSummary(data) {
  console.log('\nScraped Data Summary:');
  console.log(`- Title: ${data.title}`);
  console.log(`- URL: ${data.url}`);
  console.log(`- Projects found: ${data.projects.length}`);
  
  // Print all projects
  if (data.projects.length > 0) {
    console.log('\nAll Projects:');
    data.projects.forEach((p, index) => {
      console.log(`\n${index + 1}. ${p.title}`);
      if (p.description) console.log(`   Status: ${p.description}`);
      if (p.url) console.log(`   URL: ${p.url}`);
    });
  }
}

module.exports = {
  scrapeProjects,
  saveScrapedData,
  printScrapedDataSummary
};
