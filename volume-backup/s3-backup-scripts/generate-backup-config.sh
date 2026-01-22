#!/bin/bash
# ############################################
#  Backup Configuration Generator
# ############################################
#
# This script automatically generates the CONTAINERS_LIST configuration
# for docker-volume-backup.sh by scanning running Docker containers.
#
# Features:
#   - Scans all running Docker containers
#   - Identifies all mounted volumes
#   - Generates properly formatted CONTAINERS_LIST entries
#
# Output format:
#   Semicolon-separated string ready to use in .env file
#   Format: "container:volume:backup-name;container:volume:backup-name"
#
# Usage:
#   ./generate-backup-config.sh
#   
# To update .env directly:
#   ./generate-backup-config.sh >> .env
#
# Note: Review and adjust the generated configuration as needed before use.
#

echo "# Container and Volume Configuration"
echo "# Generated on: $(date)"
echo "# Copy the CONTAINERS_LIST line below to your .env file"
echo ""
echo -n "CONTAINERS_LIST=\""

# Build semicolon-separated list
first_entry=true

# Get all running containers
docker ps --format '{{.Names}}' | while read -r container_name; do
  # Get all volume mounts for this container
  volumes=$(docker inspect "$container_name" --format '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}}{{"\n"}}{{end}}{{end}}')
  
  # If container has volumes, process them
  if [ -n "$volumes" ]; then
    while IFS= read -r volume_name; do
      if [ -n "$volume_name" ]; then
        # Generate a clean backup name
        backup_name=$(echo "$container_name-$volume_name" | sed 's/[^a-zA-Z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')
        backup_name="${backup_name}-backup"
        
        # Add separator if not first entry
        if [ "$first_entry" = false ]; then
          echo -n ";"
        fi
        first_entry=false
        
        echo -n "$container_name:$volume_name:$backup_name"
      fi
    done <<< "$volumes"
  fi
done

echo "\""
echo ""
echo "# Configuration generated successfully!"