const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteGeneral() {
    try {
        const room = await prisma.room.findFirst({ where: { name: 'Général' } });
        if (room) {
            await prisma.room.delete({ where: { id: room.id } });
            console.log('Room "Général" deleted.');
        } else {
            console.log('Room "Général" not found.');
        }
    } catch (e) {
        console.error(e);
    }
}

deleteGeneral().finally(() => prisma.$disconnect());
