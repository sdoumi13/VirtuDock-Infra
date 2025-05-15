#!/bin/bash

# Variables
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/slyma/backups"
VOLUME_NAME="mysql-data"
BACKUP_FILE="$BACKUP_DIR/mysql-data-$TIMESTAMP.tar.gz"
LOG_FILE="/var/log/backup.log"
SMB_SERVER="192.168.48.31"
SMB_SHARE="Shares"
SMB_MOUNT="/mnt/windows_share"
SMB_USER="BackupUser"
SMB_PASSWORD="Kali@123"
SMB_BACKUP_DIR="$SMB_MOUNT/backups"

# Fonction de journalisation
log_message() {
    echo "[$(date)] $1" >> $LOG_FILE
    echo "[$(date)] $1"
}

# Créer le dossier de sauvegarde local
mkdir -p $BACKUP_DIR

# Arrêter le conteneur MySQL pour garantir la cohérence
log_message "Arrêt du conteneur MySQL"
docker-compose -f /home/slyma/monitoring/docker-compose.yml stop mysql

# Sauvegarder le volume
log_message "Sauvegarde du volume $VOLUME_NAME"
docker run --rm \
  -v $VOLUME_NAME:/volume \
  -v $BACKUP_DIR:/backup \
  alpine \
  tar -czf /backup/mysql-data-$TIMESTAMP.tar.gz -C /volume .

# Redémarrer le conteneur MySQL
log_message "Redémarrage du conteneur MySQL"
docker-compose -f /home/slyma/monitoring/docker-compose.yml start mysql

# Supprimer les sauvegardes locales de plus de 7 jours
find $BACKUP_DIR -name "mysql-data-*.tar.gz" -mtime +7 -delete

# Journaliser la fin de la sauvegarde locale
log_message "Sauvegarde locale terminée : $BACKUP_FILE"

# Démonter le partage Windows s'il est déjà monté
sudo umount -f $SMB_MOUNT 2>/dev/null

# Créer le point de montage si nécessaire
sudo mkdir -p $SMB_MOUNT

# Monter le partage Windows avec les bonnes options
log_message "Montage du partage SMB //$SMB_SERVER/$SMB_SHARE"
sudo mount -t cifs -o username=$SMB_USER,password=$SMB_PASSWORD,uid=$(id -u),gid=$(id -g),file_mode=0777,dir_mode=0777 //$SMB_SERVER/$SMB_SHARE $SMB_MOUNT

# Vérifier si le montage a réussi
if [ $? -ne 0 ]; then
    log_message "ERREUR: Échec du montage du partage SMB"
    exit 1
fi

# Créer le dossier de destination sur le partage si nécessaire
mkdir -p $SMB_BACKUP_DIR 2>/dev/null

# Vérifier les permissions en créant un fichier test
touch $SMB_BACKUP_DIR/test_$(date +%s).txt
if [ $? -ne 0 ]; then
    log_message "ERREUR: Impossible d'écrire sur le partage SMB - Problème de permissions"
    sudo umount $SMB_MOUNT
    exit 1
fi

# Copier la sauvegarde vers le partage Windows
log_message "Copie de la sauvegarde vers le partage SMB"
cp $BACKUP_FILE $SMB_BACKUP_DIR/

# Vérifier si la copie a réussi
if [ $? -ne 0 ]; then
    log_message "ERREUR: Échec de la copie de la sauvegarde vers le partage SMB"
else
    log_message "Sauvegarde copiée avec succès vers $SMB_BACKUP_DIR/$(basename $BACKUP_FILE)"
fi

# Supprimer les sauvegardes distantes de plus de 30 jours
find $SMB_BACKUP_DIR -name "mysql-data-*.tar.gz" -mtime +30 -delete 2>/dev/null

# Démonter le partage
log_message "Démontage du partage SMB"
sudo umount $SMB_MOUNT

log_message "Opération terminée"
