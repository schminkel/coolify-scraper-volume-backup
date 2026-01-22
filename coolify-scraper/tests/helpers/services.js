const fs = require('fs');
const path = require('path');

/**
 * Scrapes detailed service configuration from the service page
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<Object>} Service configuration data
 */
async function scrapeServiceConfig(page) {
  const configData = {
    title: '',
    url: '',
    timestamp: new Date().toISOString(),
    dockerCompose: null,
    environmentVariables: null
  };
  
  // Get basic page info
  configData.title = await page.title();
  configData.url = page.url();
  
  // Click "Edit Compose File" button
  try {
    const editComposeButton = page.locator('button:has-text("Edit Compose File")');
    if (await editComposeButton.count() > 0) {
      await editComposeButton.click();
      
      // Wait for modal to open
      await page.waitForSelector('h3:has-text("Edit Docker Compose")', { timeout: 5000 });
      await page.waitForTimeout(500);
      
      // Extract docker-compose content from textarea
      const dockerComposeRaw = await page.evaluate(() => {
        const textarea = document.querySelector('textarea[wire\\:model="dockerComposeRaw"]');
        return textarea ? textarea.value : null;
      });
      
      // Store as array of lines for better readability
      configData.dockerCompose = dockerComposeRaw ? dockerComposeRaw.split('\n') : null;
      
      // Take screenshot before closing modal
      try {
        const screenshotPath = path.join(__dirname, '..', '..', 'screenshots', `service-compose-modal-${Date.now()}.png`);
        const screenshotDir = path.dirname(screenshotPath);
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`    Screenshot saved: ${screenshotPath}`);
      } catch (screenshotError) {
        console.warn('    Screenshot failed:', screenshotError.message);
      }
      
      // Close the modal - optimized approach
      // Check if modal is actually visible first
      const modalVisible = await page.locator('h3:has-text("Edit Docker Compose")').count();
      
      if (modalVisible > 0) {
        // Try Escape key first (fastest and most reliable)
        try {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          
          const stillVisible = await page.locator('h3:has-text("Edit Docker Compose")').count();
          if (stillVisible === 0) {
            // Modal closed successfully
          } else {
            // If Escape didn't work, try clicking outside the modal
            await page.mouse.click(10, 10);
            await page.waitForTimeout(300);
          }
        } catch (err) {
          // Continue anyway, modal state doesn't affect data collection
        }
      }
      
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
    } else {
      configData.dockerComposeNote = 'Edit Compose File button not found';
    }
  } catch (error) {
    configData.dockerComposeError = error.message;
  }
  
  // Now scrape environment variables (same as applications)
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
          const screenshotPath = path.join(__dirname, '..', '..', 'screenshots', `service-env-vars-textarea-${Date.now()}.png`);
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
        
        // Store as array of lines for better readability
        configData.environmentVariables = envVariables ? envVariables.split('\n') : null;
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
 * Saves service configurations to a JSON file
 * @param {Object} data - The configurations data object
 * @param {string} baseDir - Base directory for the tests
 * @returns {string} Path to the saved file
 */
function saveServiceConfigs(data, baseDir) {
  const dataDir = path.join(baseDir, '..', 'scraped-data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const dataPath = path.join(dataDir, `scraped-service-configs-${Date.now()}.json`);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  return dataPath;
}

/**
 * Prints service config summary
 * @param {string} serviceName - Name of the service
 * @param {boolean} success - Whether scraping was successful
 */
function printServiceConfigSummary(serviceName, success) {
  if (success) {
    console.log(`    ✓ ${serviceName} - Configuration scraped`);
  } else {
    console.log(`    ✗ ${serviceName} - Failed to scrape configuration`);
  }
}

module.exports = {
  scrapeServiceConfig,
  saveServiceConfigs,
  printServiceConfigSummary
};
