const fs = require('fs');
const path = require('path');

/**
 * Scrapes detailed application configuration from the application page
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<Object>} Application configuration data
 */
async function scrapeApplicationConfig(page) {
  const configData = await page.evaluate(() => {
    const data = {
      title: document.title,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      general: {},
      docker: {},
      network: {},
      build: {},
      deployment: {}
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
    data.general.buildPack = getValue('select[wire\\:model\\.live="buildPack"]');
    data.general.domains = getValue('input[wire\\:model="fqdn"]');
    data.general.redirect = getValue('select[wire\\:model="redirect"]');
    
    // Docker Registry
    data.docker.registryImageName = getValue('input[wire\\:model="dockerRegistryImageName"]');
    data.docker.registryImageTag = getValue('input[wire\\:model="dockerRegistryImageTag"]');
    
    // Build Configuration
    data.build.baseDirectory = getValue('input[wire\\:model\\.defer="baseDirectory"]');
    data.build.dockerfileLocation = getValue('input[wire\\:model\\.defer="dockerfileLocation"]');
    data.build.dockerfileTargetBuild = getValue('input[wire\\:model="dockerfileTargetBuild"]');
    data.build.watchPaths = getValue('textarea[wire\\:model="watchPaths"]');
    data.build.customDockerRunOptions = getValue('input[wire\\:model="customDockerRunOptions"]');
    data.build.isBuildServerEnabled = getValue('input[wire\\:model="isBuildServerEnabled"]');
    
    // Network Configuration
    data.network.portsExposes = getValue('input[wire\\:model="portsExposes"]');
    data.network.portsMappings = getValue('input[wire\\:model="portsMappings"]');
    data.network.customNetworkAliases = getValue('input[wire\\:model="customNetworkAliases"]');
    
    // HTTP Basic Auth
    data.network.isHttpBasicAuthEnabled = getValue('input[wire\\:model="isHttpBasicAuthEnabled"]');
    
    // Container Labels
    data.docker.customLabels = getValue('textarea[wire\\:model="customLabels"]') || 
                               getValue('[wire\\:model="customLabels"]');
    data.docker.isContainerLabelReadonlyEnabled = getValue('input[wire\\:model="isContainerLabelReadonlyEnabled"]');
    data.docker.isContainerLabelEscapeEnabled = getValue('input[wire\\:model="isContainerLabelEscapeEnabled"]');
    
    // Deployment Commands
    data.deployment.preDeploymentCommand = getValue('input[wire\\:model="preDeploymentCommand"]');
    data.deployment.postDeploymentCommand = getValue('input[wire\\:model="postDeploymentCommand"]');
    
    return data;
  });
  
  // Now scrape environment variables
  try {
    // Click on Environment Variables link in the menu
    const envVarLink = page.locator('a.menu-item[href*="/environment-variables"]');
    if (await envVarLink.count() > 0) {
      await envVarLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Click on Developer view button
      const devViewButton = page.locator('button:has-text("Developer view")');
      if (await devViewButton.count() > 0) {
        await devViewButton.click();
        
        // Wait for textarea to be present
        await page.waitForSelector('textarea[wire\\:model="variables"]', { timeout: 5000 });
        await page.waitForTimeout(500);
        
        // Take screenshot before extracting value
        try {
          const screenshotPath = path.join(__dirname, '..', '..', 'screenshots', `env-vars-textarea-${Date.now()}.png`);
          const screenshotDir = path.dirname(screenshotPath);
          if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
          }
          await page.screenshot({ path: screenshotPath, fullPage: true });
        } catch (screenshotError) {
          // Continue even if screenshot fails
          console.warn('Screenshot failed:', screenshotError.message);
        }
        
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
 * Checks if a database or service is accessible
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<Object>} Availability check result
 */
async function checkResourceAvailability(page) {
  const result = await page.evaluate(() => {
    return {
      title: document.title,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      isAccessible: true,
      hasError: !!document.querySelector('.error, .text-error, [class*="error"]'),
      pageLoaded: document.readyState === 'complete'
    };
  });
  
  return result;
}

/**
 * Saves application configurations to a JSON file
 * @param {Object} data - The configurations data object
 * @param {string} baseDir - Base directory for the tests
 * @returns {string} Path to the saved file
 */
function saveApplicationConfigs(data, baseDir) {
  const dataDir = path.join(baseDir, '..', 'scraped-data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const dataPath = path.join(dataDir, `scraped-application-configs-${Date.now()}.json`);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  return dataPath;
}

/**
 * Prints application config summary
 * @param {string} appName - Name of the application
 * @param {boolean} success - Whether scraping was successful
 */
function printApplicationConfigSummary(appName, success) {
  if (success) {
    console.log(`    ✓ ${appName} - Configuration scraped`);
  } else {
    console.log(`    ✗ ${appName} - Failed to scrape configuration`);
  }
}

/**
 * Prints resource availability summary
 * @param {string} resourceName - Name of the resource
 * @param {string} type - Type of resource (database/service)
 * @param {boolean} available - Whether resource is available
 */
function printResourceAvailability(resourceName, type, available) {
  const icon = available ? '✓' : '✗';
  const status = available ? 'Available' : 'Unavailable';
  console.log(`    ${icon} ${resourceName} (${type}) - ${status}`);
}

module.exports = {
  scrapeApplicationConfig,
  checkResourceAvailability,
  saveApplicationConfigs,
  printApplicationConfigSummary,
  printResourceAvailability
};
