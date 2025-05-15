#!/bin/bash

# Reset ufw
ufw reset

# Allow necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # Grafana
ufw allow 8080/tcp  # WordPress
ufw allow 8082/tcp  # Budget-App
ufw allow 9090/tcp  # Prometheus
ufw allow 9100/tcp  # Node Exporter
ufw allow 8083/tcp  # cAdvisor (adjusted based on docker-compose.yml port mapping)

# Deny all other incoming traffic
ufw default deny incoming

# Allow all outgoing traffic
ufw default allow outgoing

# Enable ufw
ufw enable
