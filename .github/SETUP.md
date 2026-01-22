# GitHub Actions Setup Guide

This guide walks you through setting up the automated weekly Coolify scraper with secure S3 storage.

## 📋 Prerequisites

- GitHub repository (public or private)
- AWS account with S3 access
- Coolify instance credentials

## 🔧 Setup Steps

### 1. Configure AWS CLI (If Not Already Done)

Before creating the S3 bucket, ensure AWS CLI is configured with your credentials:

```bash
# Configure AWS CLI with your credentials
aws configure

# You'll be prompted for:
# AWS Access Key ID: [Your Access Key]
# AWS Secret Access Key: [Your Secret Key]
# Default region name: eu-central-1
# Default output format: json
```

Or set credentials via environment variables:
```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_DEFAULT_REGION="eu-central-1"
```

Verify configuration:
```bash
aws sts get-caller-identity
```

### 2. Create S3 Bucket

```bash
# Using AWS CLI
aws s3 mb s3://coolify-scraper-backup --region eu-central-1

# Enable encryption by default
aws s3api put-bucket-encryption \
  --bucket coolify-scraper-backup \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket coolify-scraper-backup \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

Or create via AWS Console:
1. Go to S3 → Create bucket
2. Name it (e.g., `coolify-scraper-backup`)
3. Region: eu-central-1
4. Enable "Server-side encryption" (AES-256)
5. Enable "Block all public access"
6. Create bucket

### 3. Create IAM User for GitHub Actions

Create a dedicated IAM user with minimal permissions.

#### IAM Policy JSON

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::coolify-scraper-backup",
        "arn:aws:s3:::coolify-scraper-backup/*"
      ]
    }
  ]
}
```

#### Option A: Using AWS CLI

```bash
# Create IAM user
aws iam create-user --user-name github-actions-coolify-scraper

# Create the policy document (save JSON above to a file)
cat > coolify-s3-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::coolify-scraper-backup",
        "arn:aws:s3:::coolify-scraper-backup/*"
      ]
    }
  ]
}
EOF

# Create the policy
aws iam create-policy \
  --policy-name CoolifyS3BackupPolicy \
  --policy-document file://coolify-s3-policy.json

# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Attach the policy to the user
aws iam attach-user-policy \
  --user-name github-actions-coolify-scraper \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/CoolifyS3BackupPolicy

# Create access key
aws iam create-access-key --user-name github-actions-coolify-scraper

# Save the AccessKeyId and SecretAccessKey from the output
# Clean up the policy file
rm coolify-s3-policy.json
```

#### Option B: Using AWS Console

1. AWS Console → IAM → Users → Create user
2. Name: `github-actions-coolify-scraper`
3. Attach policy: Create inline policy with JSON above
4. Create access key → "Application running outside AWS"
5. Save Access Key ID and Secret Access Key


### 4. Configure GitHub Repository Secrets

#### Option A: Using GitHub Web Interface

Go to: **Repository → Settings → Secrets and variables → Actions → New repository secret**

Add these secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `COOLIFY_URL` | Your Coolify instance URL | `https://coolify.yourdomain.com` |
| `COOLIFY_EMAIL` | Coolify login email | `admin@yourdomain.com` |
| `COOLIFY_PASSWORD` | Coolify login password | `your-secure-password` |
| `AWS_ACCESS_KEY_ID` | IAM user access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | S3 bucket region | `eu-central-1` |
| `S3_BUCKET_NAME` | S3 bucket name | `coolify-scraper-backup` |
| `BACKUP_RETENTION_DAYS` | Days to keep backups (optional) | `30` |

#### Option B: Using GitHub CLI

Install GitHub CLI if not already installed: https://cli.github.com/

```bash
# Authenticate with GitHub
gh auth login

# Navigate to your repository directory
cd /path/to/coolify-scraper-volume-backup

# Add secrets one by one (you'll be prompted for values)
gh secret set COOLIFY_URL
gh secret set COOLIFY_EMAIL
gh secret set COOLIFY_PASSWORD
gh secret set AWS_ACCESS_KEY_ID
gh secret set AWS_SECRET_ACCESS_KEY
gh secret set AWS_REGION
gh secret set S3_BUCKET_NAME
gh secret set BACKUP_RETENTION_DAYS

# Or set secrets directly from command line (less secure - visible in shell history)
gh secret set COOLIFY_URL --body "https://coolify.yourdomain.com"
gh secret set COOLIFY_EMAIL --body "admin@yourdomain.com"
gh secret set COOLIFY_PASSWORD --body "your-secure-password"
gh secret set AWS_ACCESS_KEY_ID --body "AKIAIOSFODNN7EXAMPLE"
gh secret set AWS_SECRET_ACCESS_KEY --body "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
gh secret set AWS_REGION --body "eu-central-1"
gh secret set S3_BUCKET_NAME --body "coolify-scraper-backup"
gh secret set BACKUP_RETENTION_DAYS --body "30"

# Verify secrets were added
gh secret list
```

**Pro tip**: For sensitive values, use the interactive prompt (without `--body`) to avoid leaving credentials in your shell history.

#### Option C: Using .env File with GitHub CLI

Create a `.env` file with all your secrets, then bulk upload them:

```bash
# Authenticate with GitHub
gh auth login

# Create .env file for GitHub secrets (NOT the same as coolify-scraper/.env)
cat > .github-secrets.env << 'EOF'
COOLIFY_URL=https://coolify.yourdomain.com
COOLIFY_EMAIL=admin@yourdomain.com
COOLIFY_PASSWORD=your-secure-password
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=eu-central-1
S3_BUCKET_NAME=coolify-scraper-backup
BACKUP_RETENTION_DAYS=30
EOF

# Read .env file and set each secret
while IFS='=' read -r key value; do
  # Skip empty lines and comments
  [[ -z "$key" || "$key" =~ ^#.*$ ]] && continue
  # Remove any quotes around the value
  value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  echo "Setting secret: $key"
  gh secret set "$key" --body "$value"
done < .github-secrets.env

# Verify secrets were added
gh secret list

# IMPORTANT: Delete the .env file after uploading to avoid exposing secrets
rm .github-secrets.env
echo "✓ Secrets uploaded and .env file deleted"
```

**Security Note**: The `.env` file contains sensitive credentials. Always delete it immediately after use and never commit it to git.

### 5. Test the Workflow

#### Manual Test Run
1. Go to **Actions** tab in GitHub
2. Click **Weekly Coolify Scraper**
3. Click **Run workflow** → Run workflow
4. Wait for completion (up to 30 minutes)

#### Verify Success
1. Check workflow logs for green checkmarks
2. Verify S3 bucket contains backup file:
   ```bash
   aws s3 ls s3://coolify-scraper-backup/coolify-scraper-backups/
   ```

### 6. Configure Schedule (Optional)

The workflow runs **every Sunday at 00:00 UTC** by default.

To change the schedule, edit [.github/workflows/weekly-scraper.yml](.github/workflows/weekly-scraper.yml):

```yaml
on:
  schedule:
    # Examples:
    - cron: '0 2 * * *'      # Daily at 2 AM UTC
    - cron: '0 8 * * 1'      # Every Monday at 8 AM UTC
    - cron: '0 0 1 * *'      # First day of each month
    - cron: '0 */6 * * *'    # Every 6 hours
```

Use [crontab.guru](https://crontab.guru/) to generate cron expressions.

## 🔒 Security Best Practices

- ✅ Use dedicated IAM user with minimal permissions
- ✅ Enable S3 bucket encryption (AES-256)
- ✅ Block all public access to S3 bucket
- ✅ Rotate AWS credentials regularly
- ✅ Use read-only Coolify account if possible
- ✅ Enable S3 bucket versioning for backup protection
- ✅ Set up CloudWatch alerts for failed uploads
- ✅ Review IAM permissions quarterly

## 📥 Downloading Backups

### Using AWS CLI

```bash
# List all backups
aws s3 ls s3://coolify-scraper-backup/coolify-scraper-backups/

# Download latest backup
LATEST=$(aws s3 ls s3://coolify-scraper-backup/coolify-scraper-backups/ | sort | tail -n 1 | awk '{print $4}')
aws s3 cp s3://coolify-scraper-backup/coolify-scraper-backups/${LATEST} ./

# Extract backup
tar -xzf coolify-backup-*.tar.gz
```

### Using AWS Console
1. Go to S3 → your bucket → `coolify-scraper-backups/`
2. Select backup file
3. Click **Download**
4. Extract: `tar -xzf coolify-backup-*.tar.gz`

## 🔍 Monitoring

### Check Workflow Status
- GitHub → Actions → Weekly Coolify Scraper
- View logs for each run
- Check for failed steps

### Verify Backups
```bash
# Count backups
aws s3 ls s3://coolify-scraper-backup/coolify-scraper-backups/ | wc -l

# Check latest backup date
aws s3 ls s3://coolify-scraper-backup/coolify-scraper-backups/ | sort | tail -n 1

# Verify encryption
aws s3api head-object \
  --bucket coolify-scraper-backup \
  --key coolify-scraper-backups/coolify-backup-YYYYMMDD-HHMMSS.tar.gz \
  --query ServerSideEncryption
```

### Set Up Alerts (Optional)

Create CloudWatch alarm for failed uploads:
1. CloudWatch → Alarms → Create alarm
2. Metric: S3 → Bucket Metrics → PutObject errors
3. Threshold: > 0
4. Action: Send SNS notification

## 🛠️ Troubleshooting

### Workflow Fails at "Run scraper"
- Check Coolify credentials in GitHub secrets
- Verify Coolify instance is accessible
- Check workflow logs for specific error

### AWS Upload Fails
- Verify IAM credentials are correct
- Check IAM policy allows S3 operations
- Ensure S3 bucket exists and region is correct
- Check bucket name in secrets (no `s3://` prefix)

### No Backup Created
- Check if scraper completed successfully
- Verify `scraped-data/` directory has files
- Review "Create compressed backup" step logs

### Old Backups Not Deleted
- Check `BACKUP_RETENTION_DAYS` secret is set
- Verify IAM user has `s3:DeleteObject` permission
- Review "Cleanup old S3 backups" step logs

## 📊 Cost Estimation

Approximate AWS costs for S3 storage:

- **Storage**: $0.023/GB/month (S3 Standard)
- **Upload**: Free
- **Download**: $0.09/GB (first 10TB)

Example: 100MB backup weekly for a month
- Storage: ~400MB = $0.01/month
- 4 uploads: Free
- Total: **~$0.01/month**

## 🔄 Backup Retention

Default: **30 days**

To change, update `BACKUP_RETENTION_DAYS` secret in GitHub.

Backups are automatically deleted after retention period by the workflow.

## 📞 Support

For issues with:
- **Workflow**: Check GitHub Actions logs
- **AWS/S3**: Review IAM permissions and bucket settings
- **Coolify**: Verify credentials and instance accessibility

## 🔗 Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Playwright Configuration](../coolify-scraper/playwright.config.js)
- [Main README](../README.md)
