const prisma = require('../utils/prisma');

const getAllRooms = async (req, res) => {
  try {
    // Pour les admins, montrer toutes les salles avec plus de détails
    const isAdmin = req.user.role === 'ADMIN';
    const rooms = await prisma.room.findMany({
      include: {
        _count: {
          select: { members: true, messages: true }
        },
        ...(isAdmin && {
          members: {
            select: { user: { select: { id: true, firstname: true, lastname: true, email: true, role: true } } }
          }
        })
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des salles.' });
  }
};

const getPublicRooms = async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      select: { id: true, name: true }
    });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des classes.' });
  }
};

const createRoom = async (req, res) => {
  try {
    const { name, description } = req.body;
    const room = await prisma.room.create({
      data: {
        name,
        description,
        createdById: req.user.id
      }
    });
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de la salle.' });
  }
};

const getRoomById = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      include: {
        messages: {
          take: isAdmin ? 100 : 50, // Plus de messages pour les admins
          orderBy: { createdAt: 'desc' },
          include: { 
            user: { select: { firstname: true, lastname: true, avatar: true, email: isAdmin, role: isAdmin } },
            ...(isAdmin && {
              reactions: { include: { user: { select: { firstname: true, lastname: true } } } }
            })
          }
        },
        ...(isAdmin && {
          members: {
            include: {
              user: { select: { id: true, firstname: true, lastname: true, email: true, role: true } }
            }
          }
        })
      }
    });
    if (!room) return res.status(404).json({ error: 'Salle non trouvée.' });
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de la salle.' });
  }
};

const joinRoom = async (req, res) => {
  try {
    // Les admins peuvent rejoindre n'importe quel salon sans restriction
    const room = await prisma.room.findUnique({
      where: { id: req.params.id }
    });
    
    if (!room) {
      return res.status(404).json({ error: 'Salle non trouvée.' });
    }

    // Pour les admins, on crée directement le membre sans vérifier les restrictions
    const member = await prisma.roomMember.upsert({
      where: {
        userId_roomId: {
          userId: req.user.id,
          roomId: req.params.id
        }
      },
      update: {},
      create: {
        userId: req.user.id,
        roomId: req.params.id
      }
    });
    
    res.json(member);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la jonction à la salle.' });
  }
};

const leaveRoom = async (req, res) => {
  try {
    await prisma.roomMember.delete({
      where: {
        userId_roomId: {
          userId: req.user.id,
          roomId: req.params.id
        }
      }
    });
    res.json({ message: 'Vous avez quitté la salle.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la sortie de la salle.' });
  }
};

module.exports = {
  getAllRooms,
  getPublicRooms,
  createRoom,
  getRoomById,
  joinRoom,
  leaveRoom
};
