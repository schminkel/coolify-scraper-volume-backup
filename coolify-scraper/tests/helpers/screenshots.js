const fs = require('fs');
const path = require('path');

/**
 * Creates screenshots directory if it doesn't exist
 * @param {string} baseDir - Base directory for the tests
 * @returns {string} Path to screenshots directory
 */
function ensureScreenshotsDir(baseDir) {
  const screenshotsDir = path.join(baseDir, '..', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  return screenshotsDir;
}

/**
 * Takes a screenshot and saves it
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} baseDir - Base directory for the tests
 * @param {string} filename - Filename for the screenshot
 */
async function takeScreenshot(page, baseDir, filename) {
  const screenshotsDir = ensureScreenshotsDir(baseDir);
  const screenshotPath = path.join(screenshotsDir, filename);
  await page.screenshot({ 
    path: screenshotPath,
    fullPage: true 
  });
  console.log(`Screenshot saved to: ${screenshotPath}`);
  return screenshotPath;
}

module.exports = {
  ensureScreenshotsDir,
  takeScreenshot
};
