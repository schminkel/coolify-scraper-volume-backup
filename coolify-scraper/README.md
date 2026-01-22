# 🕷️ Coolify Infrastructure Scraper

A comprehensive Playwright-based automation tool that extracts complete infrastructure configurations from your Coolify instance. Perfect for documentation, auditing, migrations, and disaster recovery planning.

## 🔒 Security Notice

This project scrapes sensitive infrastructure data. **Never commit**:
- `.env` files with real credentials
- `scraped-data/` directory (contains passwords, tokens, API keys)
- `screenshots/` directory (may show sensitive UI data)
- Log files

Always review `git status` before committing to ensure no sensitive data is included.

## ✨ Features

### 🔐 **Authentication**
- Automated login with environment-based credentials
- Handles "Accept and Close" dialogs automatically
- Robust login verification

### 📦 Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Install Browser

```bash
pnpm exec playwright install chromium
```

### 3. Configure Credentials

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your Coolify instance details:

```bash
COOLIFY_URL=https://your-coolify-instance.com
COOLIFY_EMAIL=your-email@example.com
COOLIFY_PASSWORD=your-secure-password
```

**💡 Tip**: Use a read-only account if available for security.

**Alternative**: Set environment variables directly:
```bash
export COOLIFY_URL="https://your-coolify-instance.com"
export COOLIFY_EMAIL="your-email@example.com"
export COOLIFY_PASSWORD="your-secure-password"

### 🔧 **Service Scraping**
- **Complete Docker Compose files** from edit modal
- **Full environment variables** in developer view format
- Service metadata and status

### 📸 **Visual Documentation**
- Screenshots at every step (login, projects, resources, configs)
- Full-page captures for complete context
- Automatic error screenshots on failures

### 💾 **Structured Data Export**
- Timestamped JSON files for all data
- Organized by resource type
- Human-readable formatting
- Hierarchical data structure preserving project relationships

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   🚀 Usage

### Run Complete Scraping Flow

Executes the full 4-step scraping process:

```bash
pnpm test
```

**What it does:**
1. 🔐 **Login** - Authenticates to your Coolify instance
2. 📊 **Scrape Projects** - Discovers all projects
3. 📁 Project Structure

```
coolify-scraper/
├── tests/
│   ├── coolify.spec.js          # Main orchestrator (4-step flow)
│   └── helpers/
│       ├── auth.js               # Authentication & login verification
│       ├── scraper.js            # Project discovery & scraping
│       ├── resources.js          # Resource discovery across projects
│       ├── applications.js       # Deep application config extraction
│       ├── databases.js          # Deep database config extraction
│       ├── services.js           # Deep service config + Docker Compose
│  📤 Output Files

After running the scraper, you'll find organized data in multiple locations:

### 📸 Screenshots (`screenshots/`)

Timestamped screenshots capturing each step:

- `01-login-success-{timestamp}.png` - Successful login
- `02-projects-dashboard-{timestamp}.png` - Projects overview
- `03-resources-{project-name}-{timestamp}.png` - Each project's resources
- `04-app-config-{app-name}-{timestamp}.png` - Each application's config page
- `04-db-config-{db-name}-{timestamp}.png` - Each database's config page
- `🎨 Customization

### Modify Scraped Data

Edit helper files in `tests/helpers/` to customize extraction logic:

- **[applications.js](tests/helpers/applications.js)** - Application config fields
- **[databases.js](tests/helpers/databases.js)** - Database config fields  
- **[services.js](tests/helpers/services.js)** - Service Docker Compose handling
- **[resources.js](tests/helpers/resources.js)** - Resource discovery selectors
- **[scraper.js](tests/helpers/scraper.js)** - Project discovery logic

### Add New Scrapers

Create new helper modules following the existing pattern:

```javascript
const fs = require('fs');
const path = require('path');

async function scrapeCustomData(page) {
  const data = await page.evaluate(() => {
    // Your scraping logic here
    return { /* extracted data */ };
  }🔧 Configuration

### Playwright Settings ([playwright.config.js](playwright.config.js))

Key configurations you can adjust:

```javascript
{
  timeout: 1800000,              // 30-minute timeout for complete flow
  workers: 1,                    // Sequential execution (no parallel tests)
  baseURL: process.env.COOLIFY_URL,
  slowMo: process.env.HEADED ? 2000 : undefined, // 2-second delays in headed mode
  screenshot: 'only-on-failure', // Automatic error screenshots
  video: 'retain-on-failure',    // Video recording on failures
}
```

### Environment Variables

- `COOLIFY_URL` - Your Coolify instance URL (required)
- `COOLIFY_EMAIL` - Login email (required)
- `COOLIFY_PASSWORD` - Login password (required)
- `HEADED` - Set to `1` to run with visible browser (optional)

## 🐛 Troubleshooting

### Login Failures

- ✅ Verify credentials in `.env` are correct
- ✅ Ensure `COOLIFY_URL` includes `https://` and no trailing slash
- ✅ Check if Coolify instance is accessible from your network
- ✅ Try running in headed mode to observe the login process: `pnpm test:headed`
- ✅ Check for rate limiting or firewall rules

### Scraping Errors

- ✅ Run in debug mode: `pnpm test:debug`
- ✅ Check screenshots in `screenshots/` folder for visual context
- ✅ Review test results in `test-results/` and `playwright-report/`
- ✅ Verify selectors match your Coolify version (UI changes may break selectors)
- ✅ Check console output for specific error messages

### Missing Data

- ✅ Ensure resources exist in your Coolify instance
- ✅ Check that the scraper has permissions to access all pages
- ✅ Verify timeout values are sufficient for slow networks
- ✅ Look for JavaScript errors in browser console (visible in headed mode)

### Browser Issues

- ✅ Reinstall browser: `pnpm exec playwright install chromium --force`
- ✅ Clear cache: `pnpm test:clean`
- ✅ Update Playwright: `pnpm update @playwright/test`
- ✅ Check system resources (memory, disk space)

### Timeout Issues

For large infrastructures, you may need to increase timeouts in [playwright.config.js](playwright.config.js):

```javascript
{
  timeout: 3600000, // Increase to 60 minutes
}
```

## 🔒 Security Best Practices

- ✅ **Never commit `.env` files** to version control (already in `.gitignore`)
- ✅ Use **read-only accounts** when possible
- ✅ **Rotate passwords** regularly after scraping
- ✅ **Store scraped data securely** - it contains sensitive configuration
- ✅ **Review JSON exports** before sharing (may contain secrets)
- ✅ Use **environment variables** in CI/CD pipelines instead of `.env` files
- ✅ **Encrypt scraped data** at rest if it contains production configs
- ✅ **Restrict access** to scraped data using file permissions

## 📊 Use Cases

- 📋 **Infrastructure Documentation** - Generate comprehensive docs automatically
- 🔄 **Migration Planning** - Export configs before moving to new hosts
- 📈 **Compliance Auditing** - Regular infrastructure configuration audits
- 🔍 **Configuration Analysis** - Compare setups across environments
- 📦 **Disaster Recovery** - Complement volume backups with config data
- 🎓 **Team Onboarding** - Help new team members understand infrastructure
- 🔬 **Configuration Drift Detection** - Compare snapshots over time
- 🛠️ **Troubleshooting** - Historical view of configuration changes

## 💡 Tips & Best Practices

- 🕐 **Run before major changes** - Create a snapshot before infrastructure modifications
- 📅 **Schedule regular scraping** - Use cron to create periodic configuration snapshots
- 🔁 **Combine with volume backups** - Complete disaster recovery = configs + data
- 📊 **Compare over time** - Use JSON diffs to track configuration evolution
- 🎯 **Filter sensitive data** - Post-process JSON to remove secrets if needed
- 📁 **Organize by timestamp** - Keep multiple snapshots for historical analysis
- ⚡ **Use headed mode for debugging** - Visual feedback helps troubleshoot issues
- 🔍 **Validate data completeness** - Check totals in console output match expectations

## 🚦 Console Output Example

```
=== STEP 1: LOGIN ===
Navigating to login page...
Filled email field
Filled password field
Clicked login button
Login successful, waiting for dashboard to load
Screenshot saved to: /path/to/screenshots/01-login-success-1769067983020.png
✓ Login successful

=== STEP 2: SCRAPE PROJECTS ===
Screenshot saved to: /path/to/screenshots/02-projects-dashboard-1769067985123.png

Scraped Data Summary:
- Title: Coolify Dashboard
- URL: https://coolify.example.com/
- Projects found: 3

All Projects:
1. Production
   Status: Active
   URL: /project/abc-123

✓ Projects scraped successfully

=== STEP 3: SCRAPE RESOURCES ===
Found 3 projects to scrape resources from

[1/3] Processing: Production
  Project: Production
    Applications: 5, Databases: 2, Services: 1

✓ Resources scraped successfully
All resources saved to: /path/to/scraped-data/scraped-resources-data-1769068017749.json
Total resources found: 8

=== STEP 4: SCRAPE DETAILED CONFIGURATIONS ===
[1/3] Checking resources for: Production
  Applications (5):
    ✓ web-app - Configuration scraped
    ✓ api-server - Configuration scraped
    ...
  Databases (2):
    ✓ postgres-main - Configuration scraped
    ✓ redis-cache - Configuration scraped
  Services (1):
    ✓ monitoring-stack - Configuration scraped

✓ Application configurations saved to: scraped-application-configs-1769068125456.json
✓ Database configurations saved to: scraped-database-configs-1769068130789.json
✓ Service configurations saved to: scraped-service-configs-1769068135123.json

Step 4 Summary:
  - Applications configured: 5
  - Databases configured: 2
  - Services configured: 1

=== COMPLETE FLOW FINISHED ===
```);
  const filePath = path.join(dataDir, `scraped-custom-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

module.exports = { scrapeCustomData, saveCustomData };
```

### Adjust Selectors

If Coolify's UI changes, update selectors in the respective helper files:

```javascript
// Example: Updating form field selectors
const getValue = (selector) => {
  const el = document.querySelector(selector);
  return el ? el.value : null;
};

data.general.name = getValue('input[wire\\:model="name"]');
```

### Modify Workflow

Edit [coolify.spec.js](tests/coolify.spec.js) to:
- Skip certain steps (comment out sections)
- Add additional scraping phases
- Change the order of operations
- Add custom validation logicaped-data/`)

Comprehensive JSON exports with all extracted data:

#### 1. **Projects Data** (`scraped-projects-data-{timestamp}.json`)

```json
{
  "title": "Coolify Dashboard",
  "url": "https://coolify.example.com/",
  "timestamp": "2026-01-22T10:30:45.123Z",
  "projects": [
    {
      "title": "Production",
      "description": "Active",
      "url": "/project/abc123-def456"
    }
  ]
}
```

#### 2. **Resources Data** (`scraped-resources-data-{timestamp}.json`)

Aggregated resources across all projects:

```json
{
  "title": "Coolify Resources",
  "timestamp": "2026-01-22T10:31:15.456Z",
  "totalProjects": 3,
  "projects": [
    {
      "projectName": "Production",
      "projectUrl": "/project/abc123",
      "applications": [
        {
          "name": "web-app",
          "url": "/application/xyz789",
          "description": "Next.js Application",
          "fqdn": "app.example.com",
          "status": "running",
          "category": "Applications"
        }
      ],
      "databases": [
        {
          "name": "postgres-db",
          "url": "/database/db123",
          "status": "running",
          "category": "Databases"
        }
      ],
      "services": []
    }
  ]
}
```

#### 3. **Application Configs** (`scraped-application-configs-{timestamp}.json`)

Detailed configuration for every application:

```json
{
  "title": "Coolify Application Configurations",
  "timestamp": "2026-01-22T10:35:00.789Z",
  "totalApplications": 5,
  "applications": [
    {
      "applicationName": "web-app",
      "projectName": "Production",
      "general": {
        "name": "web-app",
        "description": "Main website",
        "buildPack": "nixpacks",
        "domains": "app.example.com",
        "redirect": "both"
      },
      "docker": {
        "registryImageName": null,
        "customLabels": "traefik.enable=true",
        "customDockerRunOptions": "--memory=2g"
      },
      "build": {
        "baseDirectory": "/",
        "dockerfileLocation": "./Dockerfile",
        "watchPaths": "/src/**",
        "isBuildServerEnabled": false
      },
      "network": {
        "portsExposes": "3000",
        "portsMappings": "3000:3000",
        "isHttpBasicAuthEnabled": false
      },
      "deployment": {
        "preDeploymentCommand": "npm run migrate",
        "postDeploymentCommand": "npm run seed"
      },
      "environmentVariables": "DATABASE_URL=postgresql://...\nNEXT_PUBLIC_API_URL=https://api.example.com\nNODE_ENV=production"
    }
  ]
}
```

#### 4. **Database Configs** (`scraped-database-configs-{timestamp}.json`)

Detailed configuration for every database:

```json
{
  "title": "Coolify Database Configurations",
  "timestamp": "2026-01-22T10:40:00.123Z",
  "totalDatabases": 3,
  "databases": [
    {
      "databaseName": "postgres-main",
      "projectName": "Production",
      "general": {
        "name": "postgres-main",
        "image": "postgres:16",
        "initialUsername": "admin",
        "initialDatabase": "myapp"
      },
      "network": {
        "portsMappings": "5432:5432",
        "dbUrlInternal": "postgresql://...",
        "isPublic": true,
        "publicPort": "5432"
      },
      "advanced": {
        "enableSsl": false,
        "isLogDrainEnabled": true
      },
      "environmentVariables": "POSTGRES_DB=myapp\nPOSTGRES_USER=admin\nPOSTGRES_PASSWORD=***"
    }
  ]
}
```

#### 5. **Service Configs** (`scraped-service-configs-{timestamp}.json`)

Complete Docker Compose files and environment variables:

```json
{
  "title": "Coolify Service Configurations",
  "timestamp": "2026-01-22T10:45:00.456Z",
  "totalServices": 2,
  "services": [
    {
      "serviceName": "monitoring-stack",
      "projectName": "Infrastructure",
      "dockerCompose": [
        "version: '3.8'",
        "services:",
        "  prometheus:",
        "    image: prom/prometheus:latest",
        "    ports:",
        "      - '9090:9090'",
        "  grafana:",
        "    image: grafana/grafana:latest",
        "    ports:",
        "      - '3000:3000'"
      ],
      "environmentVariables": [
        "GF_SECURITY_ADMIN_PASSWORD=***",
        "GF_INSTALL_PLUGINS=grafana-clock-panel"
      ]
    }
  ]
}
```

Step through the test with Playwright Inspector:

```bash
pnpm test:debug
```

### Clean Run

Remove all previous outputs before running:

```bash
pnpm test:clean
   Or set environment variables:
   ```bash
   export COOLIFY_EMAIL="your-email@example.com"
   export COOLIFY_PASSWORD="your-password"
   ```

## Running Tests

```bash
# Run tests in headless mode
pnpm test

# Run tests with browser visible
pnpm test:headed

# Run tests in debug mode (with Playwright Inspector)
pnpm test:debug
```

## Project Structure

```
coolify-scraper-backup/
├── tests/
│   └── coolify.spec.js          # Main test file
├── screenshots/                  # Screenshots saved here
├── scraped-data/                # JSON data saved here
├── playwright.config.js         # Playwright configuration
├── package.json                 # Project dependencies
└── .env.example                 # Example environment file
```

## Output

After running the test, you'll find:

- **Screenshots**: `screenshots/after-login-*.png`
- **Scraped Data**: `scraped-data/scraped-data-*.json`

The scraped data includes:
- Page title and URL
- All headings (h1, h2, h3)
- Links (up to 20)
- Main content text snippets

## Customization

You can modify the test in `tests/coolify.spec.js` to:
## 🔗 Related Resources

- [Playwright Documentation](https://playwright.dev) - Browser automation framework
- [Coolify Documentation](https://coolify.io/docs) - Official Coolify docs
- [Volume Backup Tools](../volume-backup/) - Companion volume backup scripts
- [Main Project README](../README.md) - Complete toolkit overview

## 🤝 Contributing

Contributions are welcome! If you find bugs or have feature requests:

1. Check existing issues
2. Open a new issue with details
3. Submit a pull request with improvements

## 📄 License

ISC

---

**⚠️ Important Notes**:
- This scraper uses **30-minute timeout** for complete flows
- Runs **sequentially** (one project at a time) for stability
- Takes **full-page screenshots** at every major step
- All data is **timestamped** for easy organization
- **Error screenshots** captured automatically on failures
- Flexible selectors handle various Coolify UI versions
