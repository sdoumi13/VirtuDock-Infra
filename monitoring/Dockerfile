FROM php:7.4-fpm

RUN apt-get update && apt-get install -y \
    nginx \
    openssl \
    php-mysql

COPY ./index.php /var/www/html/index.php
COPY ./nginx.conf /etc/nginx/nginx.conf

CMD ["sh", "-c", "nginx -g 'daemon off;' & php-fpm"]
