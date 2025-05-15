FROM php:7.4-fpm

# Install Nginx and dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    certbot \
    python3-certbot-nginx \
    procps \
    curl

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Copy the application files
COPY html/ /var/www/html
RUN chown -R www-data:www-data /var/www/html

# Copy SSL certificates
COPY certs/budget-app.crt /etc/nginx/ssl/budget-app.crt
COPY certs/budget-app.key /etc/nginx/ssl/budget-app.key

# Configure Nginx
COPY nginx.conf /etc/nginx/sites-available/default

# Expose ports
EXPOSE 80 443

# Create a startup script that properly runs PHP-FPM and Nginx
RUN echo '#!/bin/bash\n\
echo "Starting PHP-FPM..."\n\
php-fpm -D\n\
echo "Starting Nginx..."\n\
nginx -g "daemon off;"\n\
' > /start.sh && chmod +x /start.sh

# Run the startup script
CMD ["/start.sh"]
