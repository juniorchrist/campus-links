const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');

let io;

const init = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Authentication Middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentification requise.'));

      const decoded = verifyToken(token);
      if (!decoded) return next(new Error('Token invalide.'));

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, firstname: true, lastname: true, role: true, avatar: true }
      });

      if (!user) return next(new Error('Utilisateur non trouvé.'));

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Erreur d\'authentification.'));
    }
  });

  const onlineUsers = {}; 
  const globalOnlineUsers = new Map();

  // Définir getOnlineCount pour accéder à globalOnlineUsers
  getOnlineCount = () => {
    return globalOnlineUsers.size;
  };

  io.on('connection', (socket) => {
    console.log(`Utilisateur connecté: ${socket.user.firstname} (${socket.id})`);
    
    globalOnlineUsers.set(socket.user.id, { id: socket.user.id, name: `${socket.user.firstname} ${socket.user.lastname}`, avatar: socket.user.avatar, role: socket.user.role });
    io.emit('global_online_users', Array.from(globalOnlineUsers.values()));

    socket.on('join_room', async ({ roomId }) => {
      // Remove from previous room if exists
      if (socket.currentRoom && onlineUsers[socket.currentRoom]) {
          onlineUsers[socket.currentRoom].delete(socket.user.id);
          io.to(socket.currentRoom).emit('room_members', Array.from(onlineUsers[socket.currentRoom].values()));
      }

      socket.join(roomId);
      socket.currentRoom = roomId;

      // Add to presence list
      if (!onlineUsers[roomId]) onlineUsers[roomId] = new Map();
      onlineUsers[roomId].set(socket.user.id, {
          id: socket.user.id,
          name: `${socket.user.firstname} ${socket.user.lastname}`,
          role: socket.user.role,
          avatar: socket.user.avatar,
          online: true
      });

      console.log(`${socket.user.firstname} a rejoint la salle ${roomId}`);
      
      try {
        const history = await prisma.message.findMany({
          where: { roomId },
          take: 50,
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, firstname: true, lastname: true, avatar: true } },
            reactions: true,
            file: true,
            poll: true,
            snippet: true
          }
        });
        socket.emit('chat_history', history);
        
        // Broadcast updated member list
        io.to(roomId).emit('room_members', Array.from(onlineUsers[roomId].values()));
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
      }
    });

    socket.on('send_message', async (data) => {
      const { roomId, content, type, parentId, file, poll, snippet } = data;
      
      try {
        const messageData = {
          content,
          type: type || 'TEXT',
          roomId,
          userId: socket.user.id,
          parentId
        };

        const message = await prisma.message.create({
          data: messageData,
          include: {
            user: { select: { id: true, firstname: true, lastname: true, avatar: true } },
            parent: {
              include: {
                user: { select: { firstname: true, lastname: true } }
              }
            }
          }
        });

        // Add additional data if present
        if (type === 'FILE' && file) {
          await prisma.file.create({
            data: {
              messageId: message.id,
              originalName: file.originalName,
              storedName: file.storedName,
              size: file.size,
              mimetype: file.mimetype
            }
          });
        } else if (type === 'POLL' && poll) {
          await prisma.poll.create({
            data: {
              messageId: message.id,
              question: poll.question,
              options: JSON.stringify(poll.options),
              votes: JSON.stringify([])
            }
          });
        } else if (type === 'SNIPPET' && snippet) {
          await prisma.snippet.create({
            data: {
              messageId: message.id,
              language: snippet.language,
              code: snippet.code
            }
          });
        }

        // Refetch to include all relations
        const fullMessage = await prisma.message.findUnique({
          where: { id: message.id },
          include: {
            user: { select: { id: true, firstname: true, lastname: true, avatar: true } },
            reactions: true,
            file: true,
            poll: true,
            snippet: true,
            parent: {
              include: {
                user: { select: { firstname: true, lastname: true } }
              }
            }
          }
        });

        io.to(roomId).emit('receive_message', fullMessage);
      } catch (error) {
        console.error('Erreur lors de l\'envoi du message via socket:', error);
      }
    });

    socket.on('toggle_reaction', async ({ messageId, emoji }) => {
      try {
        const userId = socket.user.id;
        const existingReaction = await prisma.reaction.findUnique({
          where: {
            messageId_userId_emoji: { messageId, userId, emoji }
          }
        });

        if (existingReaction) {
          await prisma.reaction.delete({
            where: { id: existingReaction.id }
          });
        } else {
          await prisma.reaction.create({
            data: { messageId, userId, emoji }
          });
        }

        const message = await prisma.message.findUnique({
          where: { id: messageId },
          include: { reactions: true }
        });

        io.to(message.roomId).emit('update_message_reactions', { 
          messageId, 
          reactions: message.reactions 
        });
      } catch (error) {
        console.error('Erreur toggle_reaction:', error);
      }
    });

    socket.on('delete_message', async ({ messageId }) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId }
        });

        if (!message) return;

        // Check permission (owner or moderator/admin)
        if (message.userId !== socket.user.id && socket.user.role === 'STUDENT') {
          return;
        }

        await prisma.message.delete({
          where: { id: messageId }
        });

        io.to(message.roomId).emit('message_deleted', { messageId });
      } catch (error) {
        console.error('Erreur delete_message:', error);
      }
    });

    socket.on('pin_message', async ({ messageId }) => {
      try {
        const message = await prisma.message.update({
          where: { id: messageId },
          data: { pinned: true }
        });
        io.to(message.roomId).emit('message_pinned', { messageId, pinned: true });
      } catch (error) {
        console.error('Erreur pin_message:', error);
      }
    });

    socket.on('unpin_message', async ({ messageId }) => {
      try {
        const message = await prisma.message.update({
          where: { id: messageId },
          data: { pinned: false }
        });
        io.to(message.roomId).emit('message_pinned', { messageId, pinned: false });
      } catch (error) {
        console.error('Erreur unpin_message:', error);
      }
    });

    socket.on('send_flash_info', (data) => {
      if (socket.user.role === 'ADMIN' || socket.user.role === 'MODERATOR') {
        io.emit('receive_flash_info', { 
          text: data.text, 
          sender: `${socket.user.firstname} ${socket.user.lastname}` 
        });
      }
    });

    socket.on('vote_poll', async ({ messageId, optionIndex }) => {
      try {
        const poll = await prisma.poll.findUnique({
          where: { messageId }
        });

        if (!poll) return;

        let votes = JSON.parse(poll.votes);
        // Check if already voted
        const alreadyVoted = votes.some(v => v.userId === socket.user.id);
        if (alreadyVoted) return;

        votes.push({ userId: socket.user.id, optionIndex });

        const updatedPoll = await prisma.poll.update({
          where: { id: poll.id },
          data: { votes: JSON.stringify(votes) }
        });

        const message = await prisma.message.findUnique({
          where: { id: messageId }
        });

        io.to(message.roomId).emit('update_poll', { 
          messageId, 
          poll: updatedPoll 
        });
      } catch (error) {
        console.error('Erreur vote_poll:', error);
      }
    });

    socket.on('typing', ({ roomId }) => {
      socket.to(roomId).emit('user_typing', { userId: socket.user.id, name: socket.user.firstname });
    });

    socket.on('disconnect', () => {
      console.log(`Utilisateur déconnecté: ${socket.id}`);
      if (socket.currentRoom && onlineUsers[socket.currentRoom]) {
          onlineUsers[socket.currentRoom].delete(socket.user.id);
          io.to(socket.currentRoom).emit('room_members', Array.from(onlineUsers[socket.currentRoom].values()));
      }
      globalOnlineUsers.delete(socket.user.id);
      io.emit('global_online_users', Array.from(globalOnlineUsers.values()));
    });
  });

  return io;
};

const getIo = () => {
  if (!io) throw new Error('Socket.io n\'est pas initialisé.');
  return io;
};

let getOnlineCount = () => {
    // Sera défini dans la fonction init
    return 0;
};

module.exports = {
  init,
  getIo,
  getOnlineCount
};
