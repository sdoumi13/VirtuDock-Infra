# VirtuDock-Infra

This repository contains the implementation of a hybrid virtualized infrastructure for the fictional startup **TechNova**, combining **VMware Workstation** and **Docker** to deploy critical services. This project was developed as part of the Virtualization module at Université Abdelmalek Essaâdi, Faculté des Sciences et Techniques, Tanger.

## Project Overview

The **VirtuDock-Infra** project modernizes TechNova's IT infrastructure by deploying:
- A **WordPress** site (port 8080) and a **budget-app** (port 8082) in Docker containers on an Ubuntu Server VM.
- A **Windows Server** VM for file sharing via SMB.
- Monitoring tools (**Prometheus**, **Grafana**, **cAdvisor**, **Node Exporter**) for real-time performance tracking.
- Automated backups and security measures (UFW firewall, HTTPS with self-signed certificates).
- Load testing with **JMeter** to validate performance for up to 100 simultaneous users.

## Prerequisites

- **Hardware**: Intel i7 10th Gen, 16 GB RAM, 512 GB SSD
- **Software**:
  - VMware Workstation
  - Docker (version 24.x) and Docker Compose (v2.18.1)
  - Ubuntu Server (VM: 3 CPU, 6 GB RAM, 30 GB disk)
  - Windows Server (VM: 3 CPU, 4 GB RAM, 40 GB disk)
  - JMeter (Docker image `vladislav7777/jmeter:5.6.3`)

## Repository Structure

- `docker/budget-app/`: Contains the budget-app setup (`Dockerfile`, `nginx.conf`, HTML files).
- `docker/wordpress/`: WordPress deployment with `docker-compose.yml`.
- `monitoring/`: Prometheus and Grafana configurations.
- `scripts/`: Backup and firewall scripts (`backup.sh`, `configure-firewall`).
- `tests/`: JMeter test files (`jmeter-tests`).
- `images/`: Screenshots for documentation.

## Setup Instructions

### 1. Virtual Machines Configuration
- **Ubuntu Server VM**:
  - Install Ubuntu Server and configure a bridged network.
  - Install Docker and Docker Compose:
    ```bash
    sudo apt update
    sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io
    sudo usermod -aG docker $USER
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    ```
- **Windows Server VM**:
  - Configure a bridged network and set up SMB file sharing.
  - Create a shared folder (`Shares`) and enable firewall rules.

### 2. File Sharing Between VMs
- On Windows Server, share the `Shares` folder.
- On Ubuntu Server, install SMB tools and mount the folder:
  ```bash
  sudo apt install smbclient cifs-utils
  sudo mount -t cifs //<WINDOWS_IP>/Shares /mnt/share -o username=<USERNAME>,password=<PASSWORD>
  ```
- Verify:
  ```bash
  ls /mnt/share
  ```

![Shared Folder on Windows Server](./images/shared-folder-windows.png)

### 3. Docker Containers Deployment
- **Budget-App**:
  - Located in `docker/budget-app/`.
  - Includes `Dockerfile`, `nginx.conf`, and HTML files (`budget.js`, `index.php`, `style.css`).
  - Secure with HTTPS using a self-signed certificate:
    ```bash
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/ssl/budget-app.key -out /etc/nginx/ssl/budget-app.crt
    ```
  - Test HTTPS:
    ```bash
    curl -k https://192.168.48.34:8443
    ```

![Budget-App Homepage](./images/budget-app.png)

- **WordPress**:
  - Located in `docker/wordpress/`.
  - Deploy with MySQL via Docker Compose.
  - Accessible at `http://<UBUNTU_IP>:8080`.

### 4. Monitoring Setup
- Deploy **Prometheus**, **Grafana**, **cAdvisor**, **Node Exporter**, and **MySQL Exporter** using Docker Compose in `docker/monitoring/`.
- Configure Prometheus targets in `monitoring/prometheus/prometheus.yml`.

![Prometheus Targets](./images/prometheus-targets.png)

- Access Grafana at `http://<UBUNTU_IP>:3000` and import dashboards:
  - Node Exporter Full (ID 1860) for Ubuntu VM monitoring.
  - Docker and System Monitoring (ID 193) for container monitoring.
  - MySQL Overview (ID 7362).
  - WordPress Monitoring (ID 14277).

![Ubuntu VM Monitoring Dashboard (Node Exporter)](./images/dashboard-monitoring-ubuntu.png)
![Docker Containers Monitoring Dashboard](./images/dashboard-monitoring-docker.png)
![cAdvisor Metrics](./images/cadvisor-metrics.png)

### 5. Backup and Security
- **Backup Script**:
  - Located in `scripts/backup.sh`.
  - Automates `mysql-data` volume backups, saved as `mysql-data-YYYYMMDD_HHMMSS.tar.gz`.
  - Schedule via cron (hourly at minute 2):
    ```bash
    2 * * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
    ```
- **Firewall**:
  - Configuration script in `scripts/configure-firewall`.
  - Configure UFW:
    ```bash
    sudo ufw allow 8080
    sudo ufw allow 8443
    sudo ufw allow 3000
    sudo ufw enable
    ```

### 6. Load Testing with JMeter
- JMeter tests are in `tests/jmeter-tests/`.
- Pull JMeter image:
  ```bash
  docker pull vladislav7777/jmeter:5.6.3
  ```
- Create `test_plan.jmx` for `budget-app` (HTTP: 8082, HTTPS: 8443) and `wordpress` (HTTP: 8080).
- Run tests:
  ```bash
  docker run -v $(pwd)/tests/jmeter-tests:/jmeter vladislav7777/jmeter:5.6.3 -n -t /jmeter/test_plan.jmx -l /jmeter/results.jtl -e -o /jmeter/html
  ```
- Results:
  - Apdex: 0.487 (tolerance: 500ms, frustration: 1s).
  - High response times for `budget-app` HTTPS (1300ms at 11 threads).

![JMeter Optimization Results](./images/jmeter-optimization.png)

## Results and Optimizations
- **Performance**:
  - Initial high response times mitigated by setting CPU/memory limits in `docker-compose.yml` (1.5 CPU, 1536 MB for `budget-app`).
  - MySQL memory usage at 72% (370.5 MB/512 MB) suggests a bottleneck.
- **Optimizations**:
  - Increased Ubuntu VM RAM to 4 GB in VMware.
  - Optimized MySQL (indexing, caching).

## Future Improvements
- Automate with Ansible/Terraform.
- Use Kubernetes for horizontal scaling.
- Secure HTTPS with Let's Encrypt.
- Extend storage with NFS.
- Add Alertmanager for proactive alerts.

## Conclusion
**VirtuDock-Infra** delivers a scalable, monitored, and secure hybrid infrastructure for TechNova, meeting performance and resilience goals through Docker, VMware, and robust monitoring.

---

*See `Project_Rapport.pdf` for detailed documentation.*