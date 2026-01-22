#!/bin/bash
# ############################################
#  Docker Volume Restore Script
# ############################################
#
# This script restores Docker volumes from backups stored in AWS S3.
#
# Required environment variables (configured in .env file):
#   - AWS_S3_BUCKET_NAME     : S3 bucket containing backups
#   - AWS_ACCESS_KEY_ID      : AWS access key
#   - AWS_SECRET_ACCESS_KEY  : AWS secret key
#
# Interactive prompts:
#   - Target Docker volume name for restoration
#   - Backup file name to restore from S3
#
# The script performs the following operations:
#   1. Validates target volume exists (offers to create if missing)  → Line 44
#   2. Downloads the specified backup from S3                        → Line 86
#   3. Extracts backup contents into the target volume               → Line 101
#   4. Cleans up temporary files                                     → Line 114
#
# Important: Ensure containers using the target volume are stopped before proceeding.
#

# Script metadata
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# === LOAD ENVIRONMENT VARIABLES ===
if [ -f "${SCRIPT_DIR}/.env" ]; then
  # Export variables from .env file
  export $(grep -v '^#' "${SCRIPT_DIR}/.env" | xargs)
else
  echo "[ Restore Agent ] [ ERROR ] .env file not found at ${SCRIPT_DIR}/.env"
  echo "[ Restore Agent ] [ ERROR ] Restore Failed!"
  exit 1
fi

# === VOLUME NAME INPUT ===
# Prompt for the target Docker volume name to restore into
read -p "[ Restore Agent ] [ INPUT ] Enter the target Docker volume name to restore into: " TARGET_VOLUME

# === VOLUME CHECK ===
# Check if the target volume exists
if ! docker volume ls --quiet | grep -q "^$TARGET_VOLUME$"; then
  echo "[ Restore Agent ] [ ERROR ] Volume '$TARGET_VOLUME' doesn't exist."

  # Ask if the user wants to create the volume
  read -p "[ Restore Agent ] [ INPUT ] Do you want to create a new volume with the name '$TARGET_VOLUME'? (y/N): " create_volume
  if [[ "$create_volume" == "y" ]]; then
    echo "[ Restore Agent ] [ INFO ] Creating volume '$TARGET_VOLUME'..."
    docker volume create "$TARGET_VOLUME" || { 
      echo "[ Restore Agent ] [ ERROR ] Failed to create volume '$TARGET_VOLUME', aborting restore."
      echo "[ Restore Agent ] [ ERROR ] Restore Failed!"
      exit 1
    }
    echo "[ Restore Agent ] [ INFO ] Volume '$TARGET_VOLUME' created successfully."
  else
    echo "[ Restore Agent ] [ INFO ] Volume '$TARGET_VOLUME' doesn't exist and user opted not to create it. Aborting restore."
    echo "[ Restore Agent ] [ ERROR ] Restore Failed!"
    exit 1
  fi
else
  echo "[ Restore Agent ] [ INFO ] Volume '$TARGET_VOLUME' exists, continuing..."
fi

# === BACKUP FILE INPUT ===
# Prompt for the backup file name on S3
read -p "[ Restore Agent ] [ INPUT ] Enter the backup file name on S3 (e.g., backup-2024-01-14.tar.gz): " BACKUP_FILE

# === SAFETY CONFIRMATION ===
echo "[ Restore Agent ] [ INFO ] Make sure containers using '$TARGET_VOLUME' are stopped!"
read -p "[ Restore Agent ] [ INPUT ] Proceed with restore? (y/N): " confirm
if [[ "$confirm" != "y" ]]; then
  echo "[ Restore Agent ] [ ERROR ] Restore Failed: cancelled by user."
  exit 1
fi

# === RESTORE START ===
# Inform the user that restore is starting
echo "[ Restore Agent ] [ INFO ] Restoring $BACKUP_FILE from S3 bucket '$AWS_S3_BUCKET_NAME' into volume: $TARGET_VOLUME"

# Step 1: Download backup from S3 to temporary location
echo "[ Restore Agent ] [ INFO ] Downloading backup from S3..."
TEMP_DIR=$(mktemp -d)
docker run --rm \
  -v "$TEMP_DIR":/tmp/download \
  --env AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
  --env AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
  amazon/aws-cli \
  s3 cp "s3://$AWS_S3_BUCKET_NAME/$BACKUP_FILE" /tmp/download/ || {
    echo "[ Restore Agent ] [ ERROR ] Failed to download backup from S3."
    rm -rf "$TEMP_DIR"
    echo "[ Restore Agent ] [ ERROR ] Restore Failed!"
    exit 1
}
echo "[ Restore Agent ] [ INFO ] Download completed."

# Step 2: Extract backup to volume
echo "[ Restore Agent ] [ INFO ] Extracting backup to volume..."
docker run --rm \
  -v "$TARGET_VOLUME":/volume \
  -v "$TEMP_DIR":/backup \
  alpine \
  sh -c "cd /volume && tar xzf /backup/$BACKUP_FILE --strip-components=2 && echo 'Extraction successful'" || {
    echo "[ Restore Agent ] [ ERROR ] Failed to extract backup to volume."
    rm -rf "$TEMP_DIR"
    echo "[ Restore Agent ] [ ERROR ] Restore Failed!"
    exit 1
}

# Step 3: Cleanup temporary directory
echo "[ Restore Agent ] [ INFO ] Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

# If everything succeeds, notify the user
echo "[ Restore Agent ] [ SUCCESS ] Restore completed!"
