const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seed en cours...');

  // 1. Clean database
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.roomMember.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Admins
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@campuslink.com',
      password: adminPassword,
      firstname: 'Admin',
      lastname: 'Principal',
      role: 'ADMIN',
      avatar: 'AP'
    }
  });

  const admin2 = await prisma.user.create({
    data: {
      email: 'junior@campuslink.com',
      password: adminPassword,
      firstname: 'Junior',
      lastname: 'Admin',
      role: 'ADMIN',
      avatar: 'JA'
    }
  });

  // 3. Create Student
  const studentPassword = await bcrypt.hash('student123', 10);
  const student = await prisma.user.create({
    data: {
      email: 'alice@campuslink.com',
      password: studentPassword,
      firstname: 'Alice',
      lastname: 'Dupont',
      role: 'STUDENT',
      avatar: 'AD'
    }
  });

  // 4. Create Rooms
  const room1 = await prisma.room.create({
    data: {
      name: 'IDA 2',
      description: 'Salle de cours pour la filière IDA 2ème année.',
      createdById: admin.id
    }
  });

  const room2 = await prisma.room.create({
    data: {
      name: 'RIT 1',
      description: 'Salle de cours pour la filière RIT 1ère année.',
      createdById: admin.id
    }
  });

  // 5. Join Rooms
  await prisma.roomMember.create({
    data: { userId: admin.id, roomId: room1.id }
  });
  await prisma.roomMember.create({
    data: { userId: student.id, roomId: room1.id }
  });

  // 6. Create initial messages
  await prisma.message.create({
    data: {
      content: 'Bienvenue dans la salle IDA 2 !',
      type: 'TEXT',
      roomId: room1.id,
      userId: admin.id
    }
  });

  console.log('Seed terminé avec succès !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
