const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function clearAllData() {
    console.log('🧹 Début du nettoyage des données...');
    
    try {
        // Supprimer les messages d'abord (à cause des contraintes de clé étrangère)
        console.log('📝 Suppression des messages...');
        await prisma.message.deleteMany({});
        
        // Supprimer les membres des salles
        console.log('👥 Suppression des membres des salles...');
        await prisma.roomMember.deleteMany({});
        
        // Supprimer les salles
        console.log('🏠 Suppression des salles...');
        await prisma.room.deleteMany({});
        
        // Supprimer les utilisateurs (sauf l'admin principal si vous voulez)
        console.log('👤 Suppression des utilisateurs...');
        await prisma.user.deleteMany({});
        
        console.log('✅ Toutes les données ont été supprimées avec succès!');
        
    } catch (error) {
        console.error('❌ Erreur lors de la suppression des données:', error);
    } finally {
        await prisma.$disconnect();
    }
}

async function clearMessagesOnly() {
    console.log('🧹 Suppression des messages uniquement...');
    
    try {
        await prisma.message.deleteMany({});
        console.log('✅ Tous les messages ont été supprimés!');
    } catch (error) {
        console.error('❌ Erreur lors de la suppression des messages:', error);
    } finally {
        await prisma.$disconnect();
    }
}

async function clearUsersOnly() {
    console.log('🧹 Suppression des utilisateurs (sauf admin)...');
    
    try {
        // Supprimer tous les utilisateurs sauf ceux avec le rôle ADMIN
        await prisma.user.deleteMany({
            where: {
                role: {
                    not: 'ADMIN'
                }
            }
        });
        console.log('✅ Tous les utilisateurs (sauf admin) ont été supprimés!');
    } catch (error) {
        console.error('❌ Erreur lors de la suppression des utilisateurs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Fonction pour réinitialiser la base de données
async function resetDatabase() {
    console.log('🔄 Réinitialisation complète de la base de données...');
    
    try {
        // Supprimer tout dans l'ordre inverse des dépendances
        await prisma.message.deleteMany({});
        await prisma.roomMember.deleteMany({});
        await prisma.room.deleteMany({});
        await prisma.user.deleteMany({});
        
        console.log('✅ Base de données réinitialisée!');
        
        // Recréer l'utilisateur admin par défaut
        console.log('👤 Création de l\'utilisateur admin par défaut...');
        await prisma.user.create({
            data: {
                email: 'admin@campus.fr',
                password: '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ', // admin123
                firstname: 'Admin',
                lastname: 'User',
                role: 'ADMIN'
            }
        });
        
        console.log('✅ Utilisateur admin par défaut créé!');
        
    } catch (error) {
        console.error('❌ Erreur lors de la réinitialisation:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Menu interactif
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log(`
🗑️  SCRIPT DE NETTOYAGE DES DONNÉES CAMPUS LINK

Usage: node clear-data.js [option]

Options:
  all        - Supprimer TOUTES les données (utilisateurs, salles, messages)
  messages   - Supprimer uniquement les messages
  users      - Supprimer uniquement les utilisateurs (sauf admin)
  reset      - Réinitialiser complètement la base de données et recréer l'admin

Exemples:
  node clear-data.js all
  node clear-data.js messages
  node clear-data.js reset
    `);
    process.exit(0);
}

const option = args[0].toLowerCase();

switch (option) {
    case 'all':
        clearAllData();
        break;
    case 'messages':
        clearMessagesOnly();
        break;
    case 'users':
        clearUsersOnly();
        break;
    case 'reset':
        resetDatabase();
        break;
    default:
        console.log('❌ Option non reconnue. Utilisez: all, messages, users, ou reset');
        process.exit(1);
}
