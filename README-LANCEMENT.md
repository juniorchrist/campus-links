# 🚀 Guide de Lancement de Campus Link

## 📋 Prérequis

1. **Node.js** (version 16 ou supérieure)
2. **npm** (généralement installé avec Node.js)

## 🎯 Lancement Rapide

### Option 1: Script Automatique (Recommandé)

#### Sur Windows:
```bash
# Double-cliquez sur ce fichier ou exécutez dans le terminal:
start.bat
```

#### Sur Linux/Mac:
```bash
# Exécutez dans le terminal:
chmod +x start.sh
./start.sh
```

### Option 2: Manuel

```bash
# 1. Installer les dépendances (si nécessaire)
npm install

# 2. Initialiser la base de données (si nécessaire)
npx prisma generate
npx prisma db push

# 3. Démarrer le serveur
node server.js
```

## 🌐 Accès au Site

Une fois démarré, ouvrez votre navigateur et allez sur:
**http://localhost:3000**

## 👤 Comptes de Connexion

### Administrateur:
- **Email**: `admin@campus.fr`
- **Mot de passe**: `admin123`

### Utilisateur Test:
- **Email**: `test@example.com`  
- **Mot de passe**: `test123`

## 🗑️ Nettoyage des Données

### Supprimer TOUTES les données:
```bash
node clear-data.js all
```

### Supprimer uniquement les messages:
```bash
node clear-data.js messages
```

### Supprimer uniquement les utilisateurs (sauf admin):
```bash
node clear-data.js users
```

### Réinitialiser complètement (recrée l'admin):
```bash
node clear-data.js reset
```

## 🔧 Dépannage

### Port 3000 déjà utilisé:
```bash
# Sur Windows:
netstat -ano | findstr :3000
taskkill /PID [NUMERO_DU_PROCESS] /F

# Sur Linux/Mac:
lsof -ti:3000 | xargs kill -9
```

### Réinitialiser complètement:
```bash
# 1. Nettoyer les données
node clear-data.js reset

# 2. Redémarrer
start.bat  # ou ./start.sh
```

## 📱 Fonctionnalités

### ✅ Disponibles:
- 📝 Chat en temps réel
- 👥 Gestion des salles de classe
- 🛡️ Panneau d'administration
- 📊 Statistiques en direct
- 🌐 Utilisateurs en ligne
- 📢 Annonces globales
- 🎨 Interface responsive

### 🔐 Accès Admin:
1. Connectez-vous avec le compte admin
2. Cliquez sur "Admin" dans la navigation
3. Accédez à toutes les fonctionnalités de gestion

## 🚨 Important

- Ne fermez pas la fenêtre du terminal pendant l'utilisation
- Pour arrêter le serveur, appuyez sur `Ctrl+C` ou fermez la fenêtre
- Les données sont stockées dans `prisma/dev.db` (fichier SQLite)

---

**🎉 Campus Link est prêt à l'utilisation !**
