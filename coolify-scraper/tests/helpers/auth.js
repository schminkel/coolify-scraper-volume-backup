const path = require('path');

require('dotenv').config();

const COOLIFY_EMAIL = process.env.COOLIFY_EMAIL || 'your-email@example.com';
const COOLIFY_PASSWORD = process.env.COOLIFY_PASSWORD || 'your-password';

/**
 * Performs login to Coolify dashboard
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
async function login(page) {
  console.log('Navigating to login page...');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Find and fill login form
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
  
  await emailInput.fill(COOLIFY_EMAIL);
  console.log('Filled email field');
  
  await passwordInput.fill(COOLIFY_PASSWORD);
  console.log('Filled password field');
  
  await loginButton.click();
  console.log('Clicked login button');
  
  // Wait for navigation after login
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  console.log('Login successful, waiting for dashboard to load');
  
  // Handle "Accept and Close" button if it appears
  try {
    const acceptButton = page.getByRole('button', { name: 'Accept and Close' });
    await acceptButton.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await acceptButton.click();
    await page.waitForTimeout(1000);
    console.log('Clicked "Accept and Close" button');
  } catch (e) {
    console.log('No "Accept and Close" button found, continuing...');
  }
}

/**
 * Verifies that the user is logged in
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<boolean>} True if logged in
 */
async function verifyLogin(page) {
  return await page.evaluate(() => {
    const logoutForm = document.querySelector('form[action="/logout"]');
    const projectBoxes = document.querySelectorAll('.coolbox.group');
    return !!(logoutForm || projectBoxes.length > 0);
  });
}

module.exports = {
  login,
  verifyLogin
};
