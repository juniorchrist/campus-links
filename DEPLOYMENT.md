# Guide de Déploiement - Campus Link

Ce guide vous explique comment héberger votre application Campus Link pour la rendre accessible à tous.

## 1. Préparation locale
Assurez-vous que tous les fichiers sont à jour et que vous avez les dépendances nécessaires.
```bash
npm install
```

## 2. Configuration des variables d'environnement
Sur votre plateforme d'hébergement (Render, Railway, Heroku, etc.), configurez les variables suivantes :
- `DATABASE_URL` : L'URL de votre base de données (si vous n'utilisez pas SQLite en production).
- `JWT_SECRET` : Une clé secrète longue et complexe.
- `PORT` : Généralement géré automatiquement par l'hébergeur (3000 par défaut).
- `NODE_ENV` : `production`

## 3. Choix de l'hébergeur

### Option A : Render (Recommandé)
1. Créez un compte sur [Render.com](https://render.com).
2. Liez votre dépôt GitHub.
3. Créez un "Web Service".
4. Paramètres :
   - Build Command: `npm install && npx prisma generate`
   - Start Command: `npx prisma migrate deploy && npm start`
5. Ajoutez vos variables d'environnement dans l'onglet "Env Vars".

### Option B : Railway
1. Créez un projet sur [Railway.app](https://railway.app).
2. Importez votre dépôt.
3. Railway détectera automatiquement le `package.json` et le `Procfile`.
4. Configurez les variables d'environnement.

## 4. Base de Données en Production
**Note sur SQLite** : SQLite est un fichier local. Sur des hébergeurs comme Heroku ou Render (sans disque persistant), vos données seront effacées à chaque redémarrage du serveur.
Pour un usage sérieux :
1. Créez une base de données **PostgreSQL** (disponible sur Render ou Railway).
2. Changez le `provider` dans `prisma/schema.prisma` de `sqlite` à `postgresql`.
3. Mettez à jour `DATABASE_URL` avec l'URL de votre PostgreSQL.

## 5. Lancement initial
Une fois déployé, vous pouvez initialiser les données par défaut (Admin, Salles) en exécutant :
```bash
npm run db:seed
```
(Sur Render, vous pouvez le faire via le "Shell" de votre service).
