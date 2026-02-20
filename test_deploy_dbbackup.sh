git pull origin master

# Stop
docker-compose stop backup
docker-compose rm backup
# clear cache ghosts
docker rmi -f register_learn_and_grow_backup 2>/dev/null || true

# start
docker-compose build --no-cache backup
docker-compose up -d backup