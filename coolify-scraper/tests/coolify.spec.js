const { test, expect } = require('@playwright/test');
const { login, verifyLogin } = require('./helpers/auth');
const { scrapeProjects, saveScrapedData, printScrapedDataSummary } = require('./helpers/scraper');
const { getLatestScrapedDataFile, loadProjectsData, scrapeResources, saveResourcesData, printResourcesSummary } = require('./helpers/resources');
const { scrapeApplicationConfig, checkResourceAvailability, saveApplicationConfigs, printApplicationConfigSummary, printResourceAvailability } = require('./helpers/applications');
const { scrapeDatabaseConfig, saveDatabaseConfigs, printDatabaseConfigSummary } = require('./helpers/databases');
const { scrapeServiceConfig, saveServiceConfigs, printServiceConfigSummary } = require('./helpers/services');
const { takeScreenshot } = require('./helpers/screenshots');

test.describe('Coolify - Complete Flow', () => {
  test('should login, scrape projects, and scrape resources', async ({ page }) => {
    // Set longer timeout for complete flow (30 minutes)
    test.setTimeout(1800000);
    
    try {
      // ============================================
      // STEP 1: LOGIN
      // ============================================
      console.log('\n=== STEP 1: LOGIN ===');
      await login(page);
      
      // Take screenshot after login
      await takeScreenshot(page, __dirname, `01-login-success-${Date.now()}.png`);
      
      // Verify we're logged in
      const isLoggedIn = await verifyLogin(page);
      expect(isLoggedIn).toBeTruthy();
      console.log('✓ Login successful');
      
      // ============================================
      // STEP 2: SCRAPE PROJECTS
      // ============================================
      console.log('\n=== STEP 2: SCRAPE PROJECTS ===');
      
      // Take screenshot before scraping
      await takeScreenshot(page, __dirname, `02-projects-dashboard-${Date.now()}.png`);
      
      // Scrape projects
      const scrapedData = await scrapeProjects(page);
      
      // Save scraped data
      const dataPath = saveScrapedData(scrapedData, __dirname);
      console.log(`Scraped data saved to: ${dataPath}`);
      
      // Print summary
      printScrapedDataSummary(scrapedData);
      
      // Verify we scraped some projects
      expect(scrapedData.projects.length).toBeGreaterThan(0);
      console.log('\n✓ Projects scraped successfully');
      
      // ============================================
      // STEP 3: SCRAPE RESOURCES
      // ============================================
      console.log('\n=== STEP 3: SCRAPE RESOURCES ===');
      
      // Load the projects we just scraped
      const projectsFile = getLatestScrapedDataFile(__dirname);
      const projectsData = loadProjectsData(projectsFile);
      console.log(`Found ${projectsData.projects.length} projects to scrape resources from`);
      
      // Prepare aggregated resources data
      const allResourcesData = {
        title: "Coolify Resources",
        timestamp: new Date().toISOString(),
        totalProjects: projectsData.projects.length,
        projects: []
      };
      
      let totalResources = 0;
      
      // Visit each project and scrape resources
      for (let i = 0; i < projectsData.projects.length; i++) {
        const project = projectsData.projects[i];
        console.log(`\n[${i + 1}/${projectsData.projects.length}] Processing: ${project.title}`);
        
        try {
          // Navigate to project page
          await page.goto(project.url);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
          
          // Take screenshot
          const sanitizedName = project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          await takeScreenshot(page, __dirname, `03-resources-${sanitizedName}-${Date.now()}.png`);
          
          // Scrape resources
          const resourcesData = await scrapeResources(page);
          
          // Add to aggregated data
          const projectResources = {
            projectName: project.title,
            projectDescription: project.description,
            projectUrl: project.url,
            applications: resourcesData.applications,
            databases: resourcesData.databases,
            services: resourcesData.services
          };
          
          allResourcesData.projects.push(projectResources);
          
          // Print summary
          const projectTotal = resourcesData.applications.length + 
                              resourcesData.databases.length + 
                              resourcesData.services.length;
          printResourcesSummary(
            project.title,
            resourcesData.applications.length,
            resourcesData.databases.length,
            resourcesData.services.length
          );
          totalResources += projectTotal;
          
        } catch (error) {
          console.error(`  ✗ Error scraping project "${project.title}":`, error.message);
          // Add empty entry for failed project
          allResourcesData.projects.push({
            projectName: project.title,
            projectDescription: project.description,
            projectUrl: project.url,
            error: error.message,
            applications: [],
            databases: [],
            services: []
          });
        }
      }
      
      // Save all resources to a single file
      const resourcesPath = saveResourcesData(allResourcesData, __dirname);
      console.log(`\n✓ Resources scraped successfully`);
      console.log(`All resources saved to: ${resourcesPath}`);
      console.log(`Total resources found: ${totalResources}`);
      
      // ============================================
      // STEP 4: SCRAPE APPLICATION CONFIGS & CHECK RESOURCES
      // ============================================
      console.log('\n=== STEP 4: SCRAPE DETAILED CONFIGURATIONS ===');
      
      const applicationConfigs = {
        title: "Coolify Application Configurations",
        timestamp: new Date().toISOString(),
        totalApplications: 0,
        applications: []
      };
      
      const databaseConfigs = {
        title: "Coolify Database Configurations",
        timestamp: new Date().toISOString(),
        totalDatabases: 0,
        databases: []
      };
      
      const serviceConfigs = {
        title: "Coolify Service Configurations",
        timestamp: new Date().toISOString(),
        totalServices: 0,
        services: []
      };
      
      let totalApps = 0;
      let totalDbs = 0;
      let totalSvcs = 0;
      
      // Iterate through all projects and their resources
      for (let i = 0; i < allResourcesData.projects.length; i++) {
        const project = allResourcesData.projects[i];
        console.log(`\n[${i + 1}/${allResourcesData.projects.length}] Checking resources for: ${project.projectName}`);
        
        // Scrape Application Configurations
        if (project.applications && project.applications.length > 0) {
          console.log(`  Applications (${project.applications.length}):`);
          for (const app of project.applications) {
            try {
              await page.goto(app.url);
              await page.waitForLoadState('networkidle');
              await page.waitForTimeout(1000);
              
              // Take screenshot of application page
              const sanitizedAppName = app.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
              await takeScreenshot(page, __dirname, `04-app-config-${sanitizedAppName}-${Date.now()}.png`);
              
              const config = await scrapeApplicationConfig(page);
              config.applicationName = app.name;
              config.applicationUrl = app.url;
              config.projectName = project.projectName;
              config.category = app.category;
              config.status = app.status;
              config.fqdn = app.fqdn;
              
              applicationConfigs.applications.push(config);
              printApplicationConfigSummary(app.name, true);
              totalApps++;
            } catch (error) {
              console.error(`    ✗ ${app.name} - Error: ${error.message}`);
              applicationConfigs.applications.push({
                applicationName: app.name,
                applicationUrl: app.url,
                projectName: project.projectName,
                error: error.message,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
        
        // Scrape Database Configurations
        if (project.databases && project.databases.length > 0) {
          console.log(`  Databases (${project.databases.length}):`);
          for (const db of project.databases) {
            try {
              await page.goto(db.url);
              await page.waitForLoadState('networkidle');
              await page.waitForTimeout(1000);
              
              // Take screenshot of database page
              const sanitizedDbName = db.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
              await takeScreenshot(page, __dirname, `04-db-config-${sanitizedDbName}-${Date.now()}.png`);
              
              const config = await scrapeDatabaseConfig(page);
              config.databaseName = db.name;
              config.databaseUrl = db.url;
              config.projectName = project.projectName;
              config.category = db.category;
              config.status = db.status;
              config.fqdn = db.fqdn;
              
              databaseConfigs.databases.push(config);
              printDatabaseConfigSummary(db.name, true);
              totalDbs++;
            } catch (error) {
              console.error(`    ✗ ${db.name} - Error: ${error.message}`);
              databaseConfigs.databases.push({
                databaseName: db.name,
                databaseUrl: db.url,
                projectName: project.projectName,
                error: error.message,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
        
        // Scrape Service Configurations
        if (project.services && project.services.length > 0) {
          console.log(`  Services (${project.services.length}):`);
          for (const svc of project.services) {
            try {
              await page.goto(svc.url);
              await page.waitForLoadState('networkidle');
              await page.waitForTimeout(1000);
              
              // Take screenshot of service page
              const sanitizedSvcName = svc.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
              await takeScreenshot(page, __dirname, `04-svc-config-${sanitizedSvcName}-${Date.now()}.png`);
              
              const config = await scrapeServiceConfig(page);
              config.serviceName = svc.name;
              config.serviceUrl = svc.url;
              config.projectName = project.projectName;
              config.category = svc.category;
              config.status = svc.status;
              config.fqdn = svc.fqdn;
              
              serviceConfigs.services.push(config);
              printServiceConfigSummary(svc.name, true);
              totalSvcs++;
            } catch (error) {
              console.error(`    ✗ ${svc.name} - Error: ${error.message}`);
              serviceConfigs.services.push({
                serviceName: svc.name,
                serviceUrl: svc.url,
                projectName: project.projectName,
                error: error.message,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      }
      
      // Save application configurations
      if (applicationConfigs.applications.length > 0) {
        applicationConfigs.totalApplications = applicationConfigs.applications.length;
        const appConfigPath = saveApplicationConfigs(applicationConfigs, __dirname);
        console.log(`\n✓ Application configurations saved to: ${appConfigPath}`);
      }
      
      // Save database configurations
      if (databaseConfigs.databases.length > 0) {
        databaseConfigs.totalDatabases = databaseConfigs.databases.length;
        const dbConfigPath = saveDatabaseConfigs(databaseConfigs, __dirname);
        console.log(`✓ Database configurations saved to: ${dbConfigPath}`);
      }
      
      // Save service configurations
      if (serviceConfigs.services.length > 0) {
        serviceConfigs.totalServices = serviceConfigs.services.length;
        const svcConfigPath = saveServiceConfigs(serviceConfigs, __dirname);
        console.log(`✓ Service configurations saved to: ${svcConfigPath}`);
      }
      
      console.log(`\nStep 4 Summary:`);
      console.log(`  - Applications configured: ${totalApps}`);
      console.log(`  - Databases configured: ${totalDbs}`);
      console.log(`  - Services configured: ${totalSvcs}`);
      
      console.log('\n=== COMPLETE FLOW FINISHED ===');
      
    } catch (error) {
      console.error('Error during test:', error);
      await takeScreenshot(page, __dirname, `error-${Date.now()}.png`);
      throw error;
    }
  });
});
