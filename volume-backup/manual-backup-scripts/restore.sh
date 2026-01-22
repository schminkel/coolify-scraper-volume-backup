#!/bin/bash

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

# === BACKUP DIRECTORY INPUT ===
# Prompt for the backup directory (default: ./volume-backup)
read -p "[ Restore Agent ] [ INPUT ] Enter the backup directory (default: ./volume-backup): " BACKUP_DIR
BACKUP_DIR=${BACKUP_DIR:-./volume-backup}

# === BACKUP DIRECTORY CHECK ===
# Check if the backup directory exists
if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "[ Restore Agent ] [ ERROR ] Backup directory not found: $BACKUP_DIR"
  echo "[ Restore Agent ] [ ERROR ] Restore Failed!"
  exit 1
fi
echo "[ Restore Agent ] [ INFO ] Backup directory '$BACKUP_DIR' found, continuing..."

# === BACKUP FILE INPUT ===
# Prompt for the backup file name
read -p "[ Restore Agent ] [ INPUT ] Enter the backup file name (e.g., abc123_postgresql.tar.gz): " BACKUP_FILE

# === BACKUP FILE CHECK ===
# Check if the backup file exists
if [[ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]]; then
  echo "[ Restore Agent ] [ ERROR ] Backup file not found: $BACKUP_DIR/$BACKUP_FILE"
  echo "[ Restore Agent ] [ ERROR ] Restore Failed!"
  exit 1
fi
echo "[ Restore Agent ] [ INFO ] Backup file '$BACKUP_FILE' found, continuing..."

# === SAFETY CONFIRMATION ===
echo "[ Restore Agent ] [ INFO ] Make sure containers using '$TARGET_VOLUME' are stopped!"
read -p "[ Restore Agent ] [ INPUT ] Proceed with restore? (y/N): " confirm
if [[ "$confirm" != "y" ]]; then
  echo "[ Restore Agent ] [ ERROR ] Restore Failed: cancelled by user."
  exit 1
fi

# === RESTORE START ===
# Inform the user that restore is starting
echo "[ Restore Agent ] [ INFO ] Restoring $BACKUP_FILE into volume: $TARGET_VOLUME"

# Run the Docker container to restore the backup
docker run --rm \
  -v "$TARGET_VOLUME":/volume \
  -v "$(pwd)/$BACKUP_DIR":/backup \
  busybox \
  sh -c "cd /volume && tar xzf /backup/$BACKUP_FILE" || { 
    # If the restore process fails, print an error message and exit
    echo "[ Restore Agent ] [ ERROR ] Docker restore process failed, aborting."
    echo "[ Restore Agent ] [ ERROR ] Restore Failed!"
    exit 1
}

# If everything succeeds, notify the user
echo "[ Restore Agent ] [ SUCCESS ] Restore completed!"
