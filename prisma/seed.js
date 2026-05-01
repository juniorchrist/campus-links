const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seed en cours...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  
  // 1. Create Admin if not exists
  const adminEmail = 'admin@campuslink.com';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: adminPassword,
        firstname: 'Admin',
        lastname: 'Principal',
        role: 'ADMIN',
        avatar: 'AP'
      }
    });
    console.log('Compte Admin créé !');
  } else {
    console.log('Compte Admin déjà existant.');
  }

  // 2. Create Rooms if not exist
  const roomName = 'Général';
  let room = await prisma.room.findFirst({ where: { name: roomName } });
  
  if (!room) {
    room = await prisma.room.create({
      data: {
        name: roomName,
        description: 'Salle de discussion générale.',
        createdById: admin.id
      }
    });
    console.log('Salle Générale créée !');
  }

  console.log('Seed terminé avec succès !');
}

main()
  .catch((e) => {
    console.error('Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
