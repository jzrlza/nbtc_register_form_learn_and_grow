git pull origin master

# Stop
docker-compose stop backup
docker-compose rm backup
# clear cache ghosts
docker rmi -f register_learn_and_grow_backup 2>/dev/null || true

# start
docker-compose build --no-cache backup
docker-compose up -d backup




# List available backups
ls -lah backups/

# Find the most recent backup (if you want the latest)
LATEST_BACKUP=$(ls -t backups/*.sql.gz | head -1)
echo "Latest backup: $LATEST_BACKUP"

# Decompress and restore the latest backup (example)
gunzip -c backups/backup_20231201_020001.sql.gz | docker exec -i register_form_learn_and_grow_database_production mysql -u root -p${MYSQL_ROOT_PASSWORD} ${DB_NAME}

# Replace with your actual backup filename
gunzip -c backups/backup_20231201_020001.sql.gz | docker exec -i register_form_learn_and_grow_database_production mysql -u root -p${MYSQL_ROOT_PASSWORD} ${DB_NAME}

# For restoring to a specific database (if your backup contains multiple DBs)
gunzip -c backups/backup_20231201_020001.sql.gz | docker exec -i register_form_learn_and_grow_database_production mysql -u root -p${MYSQL_ROOT_PASSWORD}


# Check if tables are restored
docker exec -it register_form_learn_and_grow_database_production mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "USE ${DB_NAME}; SHOW TABLES;"

# Check row counts (example)
docker exec -it register_form_learn_and_grow_database_production mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "USE ${DB_NAME}; SELECT COUNT(*) FROM your_table_name;"

# Now start all services including backup container
docker-compose up -d



#recover.sh

#!/bin/bash

# Load environment variables
source .env

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    # Use latest backup if not specified
    BACKUP_FILE=$(ls -t backups/*.sql.gz | head -1)
    echo "No backup specified. Using latest: $BACKUP_FILE"
fi

echo "Starting recovery process..."

# Stop everything
docker-compose down -v

# Start only database
docker-compose up -d database

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
sleep 10

# Restore from backup
echo "Restoring from $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | docker exec -i register_form_learn_and_grow_database_production mysql -u root -p${MYSQL_ROOT_PASSWORD} ${DB_NAME}

if [ $? -eq 0 ]; then
    echo "Recovery completed successfully!"
    
    # Verify
    docker exec -i register_form_learn_and_grow_database_production mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "USE ${DB_NAME}; SHOW TABLES;"
    
    # Start backup service
    docker-compose up -d backup
    echo "All services started."
else
    echo "Recovery failed!"
    exit 1
fi