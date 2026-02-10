git pull origin master

#stop and delete
docker-compose stop database
docker-compose rm -f database

cat onenbtc.sql | docker exec -i register_form_learn_and_grow_database_production mysql -u root -p

#start
docker-compose up -d database

# Check if it's running
docker-compose ps

# Test connection from Ubuntu host
mysql -h 127.0.0.1 -P 3306 -u root -p
# Password: from your .env file (MYSQL_ROOT_PASSWORD)

# Or use Docker exec
docker exec -it register_form_learn_and_grow_database_production mysql -u root -p
#nbtc2026_lng
# Check databases
# USE db_name;
SHOW DATABASES;

USE learngrow_db;



