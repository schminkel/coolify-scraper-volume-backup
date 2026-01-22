#!/bin/bash
# ############################################
#  Docker Volume Backup Script to AWS S3
# ############################################
#
# This script performs automated backups of Docker volumes to AWS S3.
#
# Required environment variables (configured in .env file):
#   - AWS_S3_BUCKET_NAME       : S3 bucket for storing backups
#   - AWS_ACCESS_KEY_ID        : AWS access key
#   - AWS_SECRET_ACCESS_KEY    : AWS secret key
#   - BACKUP_RETENTION_DAYS    : Number of days to retain backups
#   - CONTAINERS_LIST          : Semicolon-separated list of container:volume:backup_name entries
#
# Configuration:
#   - CONTAINERS_LIST environment variable defines which volumes to backup
#   - Each entry format: "container_name:volume_name:backup_name"
#   - Entries separated by semicolons (;)
#
# The script performs the following operations for each entry in CONTAINERS_LIST:
#   1. Validates container and volume existence                      → Line 44
#   2. Pauses containers to ensure data consistency                  → Line 56
#   3. Creates backup and uploads to S3                              → Line 62
#   4. Unpauses containers to resume normal operation                → Line 73
#
# The script iterates through all CONTAINERS_LIST entries sequentially, processing
# each container's volumes one at a time before moving to the next.
#
# All operations are logged to docker-volume-backup.log for audit purposes.
# Designed for use with cron for scheduled automated backups.
#

# Script metadata 
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
SCRIPT_NAME=$(basename "$0") # e.g., docker-volume-backup.sh
LOG_FILE="${SCRIPT_DIR}/docker-volume-backup.log"

# Load environment variables from .env file
if [ -f "${SCRIPT_DIR}/.env" ]; then
  # Export variables from .env file
  export $(grep -v '^#' "${SCRIPT_DIR}/.env" | xargs)
else
  echo "ERROR: .env file not found at ${SCRIPT_DIR}/.env"
  exit 1
fi

# Parse CONTAINERS_LIST into array
if [ -z "$CONTAINERS_LIST" ]; then
  echo "ERROR: CONTAINERS_LIST not found in .env file"
  exit 1
fi

# Convert semicolon-separated string to array
IFS=';' read -ra CONTAINERS <<< "$CONTAINERS_LIST"

# DO NOT EDIT ABOVE THIS LINE UNLESS YOU KNOW WHAT YOU ARE DOING
# DO NOT EDIT ABOVE THIS LINE UNLESS YOU KNOW WHAT YOU ARE DOING
# DO NOT EDIT ABOVE THIS LINE UNLESS YOU KNOW WHAT YOU ARE DOING

# Logging function - writes to both console and log file
log() {
  local message="$1"
  echo "$message" | tee -a "$LOG_FILE"
}

# Start backup process
log "### [$(date)] Volume backup [${SCRIPT_NAME}] started."

# Process each container individually: pause -> backup -> unpause
for entry in "${CONTAINERS[@]}"; do
  IFS=':' read -r container volume backup_name <<< "$entry"
  
  # Check if container exists
  if ! sudo docker container inspect "$container" &>/dev/null; then
    log "### [$(date)] ERROR: Container '$container' does not exist. Skipping..."
    continue
  fi
  
  # Check if volume exists
  if ! sudo docker volume inspect "$volume" &>/dev/null; then
    log "### [$(date)] ERROR: Volume '$volume' does not exist. Skipping..."
    continue
  fi
  
  # Pause container
  sudo docker pause "$container"
  log "### [$(date)] Paused container: $container"
  
  # Wait a moment to ensure container is fully paused
  sleep 2
  
  # Backup volume
  log "### [$(date)] Backing up volume: $volume from container: $container"
  sudo docker run --rm --name "docker-volume-backup-$backup_name" \
    -v "$volume":/backup/data \
    --env AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
    --env AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
    --env AWS_S3_BUCKET_NAME="$AWS_S3_BUCKET_NAME" \
    --env BACKUP_RETENTION_DAYS="$BACKUP_RETENTION_DAYS" \
    --env BACKUP_FILENAME="$backup_name-%Y-%m-%dT%H-%M-%S.{{ .Extension }}" \
    --entrypoint backup offen/docker-volume-backup:v2
  log "### [$(date)] Backup completed for volume: $volume"
  
  # Unpause container
  sudo docker unpause "$container"
  log "### [$(date)] Unpaused container: $container"
  log "### [$(date)] ---"
done
log "### [$(date)] All volume backups completed."

# Final completion message
log "### [$(date)] Volume backup [${SCRIPT_NAME}] completed."
log ""

# DO NOT EDIT BELOW THIS LINE UNLESS YOU KNOW WHAT YOU ARE DOING
# DO NOT EDIT BELOW THIS LINE UNLESS YOU KNOW WHAT YOU ARE DOING
# DO NOT EDIT BELOW THIS LINE UNLESS YOU KNOW WHAT YOU ARE DOING

# End of script

### Additional useful commands:

### To list running containers for verification:
# docker container ls --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}"

### To check cron job logs:
# grep CRON /var/log/syslog | grep docker-volume-backup

### To monitor the backup log in real-time:
# tail -f /root/docker-backup-scripts/docker-volume-backup.log

### To schedule this script to run daily at 9am using cron:
# crontab -e
# crontab -l

### Cron syntax explanation:
# The cron syntax 0 9 * * * means:
# 0 - minute (0)
# 9 - hour (9am)
# * - every day of month
# * - every month
# * - every day of week