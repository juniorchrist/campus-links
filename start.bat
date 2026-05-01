@echo off
echo 🚀 Démarrage de Campus Link...

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js n'est pas installé. Veuillez installer Node.js d'abord.
    pause
    exit /b 1
)

REM Vérifier si les dépendances sont installées
if not exist "node_modules" (
    echo 📦 Installation des dépendances...
    npm install
)

REM Vérifier si la base de données existe
if not exist "prisma\dev.db" (
    echo 🗄️ Initialisation de la base de données...
    npx prisma generate
    npx prisma db push
)

REM Tuer les processus existants sur le port 3000
echo 🔧 Vérification du port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /f /pid %%a >nul 2>&1
)

REM Démarrer le serveur
echo 🌐 Démarrage du serveur sur http://localhost:3000...
echo.
echo ✨ Campus Link est en cours de démarrage...
echo 📱 Ouvrez votre navigateur et allez sur: http://localhost:3000
echo.
echo 👤 Connexion admin: admin@campus.fr / admin123
echo 👤 Connexion test: test@example.com / test123
echo.
echo ⚠️  Pour arrêter le serveur, fermez cette fenêtre ou appuyez sur Ctrl+C
echo.

node server.js

pause
