#!/bin/bash

# === INPUT PROMPTS ===
# Prompt for the Docker volume name and set the variable
read -p "[ Backup Agent ] [ INPUT ] Please enter the Docker volume name to back up: " VOLUME_NAME

# Inform the user of the set volume name
echo "[ Backup Agent ] [ INFO ] Backup Volume is set to $VOLUME_NAME"

# Check if the entered volume exists
if ! docker volume ls --quiet | grep -q "^$VOLUME_NAME$"; then
    echo "[ Backup Agent ] [ ERROR ] Volume '$VOLUME_NAME' doesn't exist, aborting backup."
    echo "[ Backup Agent ] [ ERROR ] Backup Failed!"
    exit 1  # Exit if volume doesn't exist
else
    echo "[ Backup Agent ] [ INFO ] Volume '$VOLUME_NAME' exists, continuing backup..."
fi

# Prompt for the directory to save the backup
read -p "[ Backup Agent ] [ INPUT ] Please enter the directory to save the backup (Optional: press enter to use ./volume-backup): " BACKUP_DIR
# If no directory is entered, default to './volume-backup'
BACKUP_DIR=${BACKUP_DIR:-./volume-backup}

# Inform the user of the backup location
echo "[ Backup Agent ] [ INFO ] Backup location is set to $BACKUP_DIR"

# Set the backup file name based on the volume name
BACKUP_FILE="${VOLUME_NAME}-backup.tar.gz"

# Inform the user of the backup file name
echo "[ Backup Agent ] [ INFO ] Backup file name is set to $BACKUP_FILE"

# === SCRIPT START ===
# Check if the backup directory exists
if [ -d "$BACKUP_DIR" ]; then
    echo "[ Backup Agent ] [ INFO ] Directory '$BACKUP_DIR' already exists, skipping directory creation."
else
    echo "[ Backup Agent ] [ INFO ] Directory '$BACKUP_DIR' does not exist, creating directory."
    # Create the backup directory, exit if creation fails
    mkdir -p "$BACKUP_DIR" || { 
        echo "[ Backup Agent ] [ ERROR ] Failed to create directory '$BACKUP_DIR', aborting backup."
        echo "[ Backup Agent ] [ ERROR ] Backup Failed!"
        exit 1
    }
fi

# Perform the backup operation
echo "[ Backup Agent ] [ INFO ] Backing up volume: $VOLUME_NAME to $BACKUP_DIR/$BACKUP_FILE"

# Run the Docker container to create the backup
docker run --rm \
  -v "$VOLUME_NAME":/volume \
  -v "$(pwd)/$BACKUP_DIR":/backup \
  busybox \
  tar czf /backup/"$BACKUP_FILE" -C /volume . || { 
    # If the backup fails, print an error message and exit
    echo "[ Backup Agent ] [ ERROR ] Backup process failed, aborting."
    echo "[ Backup Agent ] [ ERROR ] Backup Failed!"
    exit 1
}

# If everything succeeds, notify the user
echo "[ Backup Agent ] [ SUCCESS ] Backup completed!"
