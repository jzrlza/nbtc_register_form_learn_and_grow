# Create directory for your certificates
sudo mkdir -p /etc/nginx/ssl/learnandgrow

# Copy your certificate files (adjust paths as needed)
sudo cp /var/www/nbtc_register_form_learn_and_grow/temp_files/bundle.crt /etc/nginx/ssl/learnandgrow/fullchain.pem
sudo cp /var/www/nbtc_register_form_learn_and_grow/temp_files/server.key /etc/nginx/ssl/learnandgrow/privkey.pem

# Set proper permissions
sudo chmod 600 /etc/nginx/ssl/learnandgrow/privkey.pem
sudo chmod 644 /etc/nginx/ssl/learnandgrow/*.pem
sudo chown -R root:root /etc/nginx/ssl/learnandgrow/

sudo nano /etc/nginx/sites-available/learnandgrow
