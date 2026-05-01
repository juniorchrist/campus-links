const prisma = require('../utils/prisma');
const socketService = require('../services/socketService');

const getStats = async (req, res) => {
  try {
    console.log('Fetching admin stats...');
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
    const roomCount = await prisma.room.count();
    console.log('Room count:', roomCount);
    
    const messageCount = await prisma.message.count();
    console.log('Message count:', messageCount);
    
    // Statistiques avancées
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const messagesToday = await prisma.message.count({
      where: { createdAt: { gte: today } }
    });
    console.log('Messages today:', messagesToday);
    
    const messagesTodayByUsers = await prisma.message.findMany({
      where: { createdAt: { gte: today } },
      select: { userId: true }
    });
    const activeUsersToday = new Set(messagesTodayByUsers.map(m => m.userId)).size;
    console.log('Active users today:', activeUsersToday);
    
    const topRooms = await prisma.room.findMany({
      take: 5,
      include: {
        _count: {
          select: { members: true, messages: true }
        }
      },
      orderBy: {
        messages: {
          _count: 'desc'
        }
      }
    });
    console.log('Top rooms:', topRooms.length);
    
    const recentActivity = await prisma.message.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstname: true, lastname: true } },
        room: { select: { name: true } }
      }
    });
    console.log('Recent activity:', recentActivity.length);
    
    const onlineNow = socketService.getOnlineCount();
    console.log('Online now:', onlineNow);
    
    const stats = {
      totalUsers: userCount,
      activeRooms: roomCount,
      messagesToday,
      onlineNow,
      activeUsersToday,
      topRooms,
      recentActivity
    };
    
    console.log('Sending stats response');
    res.json(stats);
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des stats.' });
  }
};

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const skip = (page - 1) * limit;
    
    const where = {};
    if (search) {
      where.OR = [
        { firstname: { contains: search, mode: 'insensitive' } },
        { lastname: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (role) {
      where.role = role;
    }
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          _count: {
            select: { messages: true, roomsCreated: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!['STUDENT', 'MODERATOR', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, firstname: true, lastname: true, role: true }
    });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du rôle.' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { user: { select: { role: true } } }
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message non trouvé.' });
    }
    
    await prisma.message.delete({
      where: { id: messageId }
    });
    
    // Notifier les utilisateurs du salon
    const io = socketService.getIo();
    io.to(message.roomId).emit('message_deleted', { messageId });
    
    res.json({ message: 'Message supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression du message.' });
  }
};

const getModerationLogs = async (req, res) => {
  try {
    // Simuler des logs de modération (dans une vraie app, on aurait une table dédiée)
    const recentMessages = await prisma.message.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstname: true, lastname: true, email: true, role: true } },
        room: { select: { name: true } }
      }
    });
    
    // Détecter les messages potentiellement problématiques
    const flaggedMessages = recentMessages.filter(msg => {
      const content = (msg.content || '').toLowerCase();
      const suspiciousWords = ['insulte', 'spam', 'vulgaire']; // À étendre
      return suspiciousWords.some(word => content.includes(word));
    });
    
    res.json({
      recentMessages,
      flaggedMessages,
      totalMessages: recentMessages.length,
      flaggedCount: flaggedMessages.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des logs.' });
  }
};

const sendGlobalAnnouncement = async (req, res) => {
  try {
    const { title, message, targetRooms } = req.body;
    
    const io = socketService.getIo();
    
    if (targetRooms && targetRooms.length > 0) {
      // Envoyer à des salons spécifiques
      targetRooms.forEach(roomId => {
        io.to(roomId).emit('global_announcement', { title, message });
      });
    } else {
      // Envoyer à tous les salons
      io.emit('global_announcement', { title, message });
    }
    
    res.json({ message: 'Annonce envoyée avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'annonce.' });
  }
};

module.exports = { 
  getStats, 
  getUsers, 
  updateUserRole, 
  deleteMessage, 
  getModerationLogs, 
  sendGlobalAnnouncement 
};
