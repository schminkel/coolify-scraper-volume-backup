const fs = require('fs');
const path = require('path');

/**
 * Scrapes detailed database configuration from the database page
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<Object>} Database configuration data
 */
async function scrapeDatabaseConfig(page) {
  const configData = await page.evaluate(() => {
    const data = {
      title: document.title,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      general: {},
      network: {},
      advanced: {}
    };
    
    // Helper to get input/select value by name or id
    const getValue = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      if (el.tagName === 'INPUT' && el.type === 'checkbox') {
        return el.checked;
      }
      if (el.tagName === 'SELECT') {
        return el.value;
      }
      if (el.tagName === 'TEXTAREA') {
        return el.value;
      }
      return el.value || el.textContent?.trim() || null;
    };
    
    // General Configuration
    data.general.name = getValue('input[wire\\:model="name"]');
    data.general.description = getValue('input[wire\\:model="description"]');
    data.general.image = getValue('input[wire\\:model="image"]');
    data.general.initialUsername = getValue('input[wire\\:model="mongoInitdbRootUsername"]');
    data.general.initialPassword = getValue('input[wire\\:model="mongoInitdbRootPassword"]');
    data.general.initialDatabase = getValue('input[wire\\:model="mongoInitdbDatabase"]');
    data.general.customDockerRunOptions = getValue('input[wire\\:model="customDockerRunOptions"]');
    
    // Network Configuration
    data.network.portsMappings = getValue('input[wire\\:model="portsMappings"]');
    data.network.dbUrlInternal = getValue('input[wire\\:model="db_url"]');
    data.network.dbUrlPublic = getValue('input[wire\\:model="db_url_public"]');
    data.network.isPublic = getValue('input[wire\\:model="isPublic"]');
    data.network.publicPort = getValue('input[wire\\:model="publicPort"]');
    
    // SSL Configuration
    data.advanced.enableSsl = getValue('input[wire\\:model="enableSsl"]');
    
    // Custom Configuration
    data.advanced.customMongoConfig = getValue('textarea[wire\\:model="mongoConf"]');
    data.advanced.isLogDrainEnabled = getValue('input[wire\\:model="isLogDrainEnabled"]');
    
    return data;
  });
  
  // Now scrape environment variables
  try {
    // Click on Environment Variables link in the menu
    const envVarLink = page.locator('a.menu-item[href*="/environment-variables"]');
    if (await envVarLink.count() > 0) {
      await envVarLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      // Click on Developer view button
      const devViewButton = page.locator('button:has-text("Developer view")');
      if (await devViewButton.count() > 0) {
        await devViewButton.click();
        
        // Wait for textarea to be present
        await page.waitForSelector('textarea[wire\\:model="variables"]', { timeout: 5000 });
        await page.waitForTimeout(500);
        
        // Get the environment variables from textarea
        const envVariables = await page.evaluate(() => {
          const textarea = document.querySelector('textarea[wire\\:model="variables"]');
          return textarea ? textarea.value : null;
        });
        
        configData.environmentVariables = envVariables;
      } else {
        configData.environmentVariables = null;
        configData.environmentVariablesNote = 'Developer view button not found';
      }
    } else {
      configData.environmentVariables = null;
      configData.environmentVariablesNote = 'Environment Variables menu not found';
    }
  } catch (error) {
    configData.environmentVariables = null;
    configData.environmentVariablesError = error.message;
  }
  
  return configData;
}

/**
 * Saves database configurations to a JSON file
 * @param {Object} data - The configurations data object
 * @param {string} baseDir - Base directory for the tests
 * @returns {string} Path to the saved file
 */
function saveDatabaseConfigs(data, baseDir) {
  const dataDir = path.join(baseDir, '..', 'scraped-data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const dataPath = path.join(dataDir, `scraped-database-configs-${Date.now()}.json`);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  return dataPath;
}

/**
 * Prints database config summary
 * @param {string} dbName - Name of the database
 * @param {boolean} success - Whether scraping was successful
 */
function printDatabaseConfigSummary(dbName, success) {
  if (success) {
    console.log(`    ✓ ${dbName} - Configuration scraped`);
  } else {
    console.log(`    ✗ ${dbName} - Failed to scrape configuration`);
  }
}

module.exports = {
  scrapeDatabaseConfig,
  saveDatabaseConfigs,
  printDatabaseConfigSummary
};
