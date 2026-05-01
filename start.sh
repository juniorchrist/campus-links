#!/bin/bash

echo "🚀 Démarrage de Campus Link..."

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez installer Node.js d'abord."
    exit 1
fi

# Vérifier si npm est installé
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé. Veuillez installer npm d'abord."
    exit 1
fi

# Vérifier si les dépendances sont installées
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Vérifier si la base de données existe
if [ ! -f "prisma/dev.db" ]; then
    echo "🗄️ Initialisation de la base de données..."
    npx prisma generate
    npx prisma db push
fi

# Tuer les processus existants sur le port 3000
echo "🔧 Vérification du port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Démarrer le serveur
echo "🌐 Démarrage du serveur sur http://localhost:3000..."
node server.js
