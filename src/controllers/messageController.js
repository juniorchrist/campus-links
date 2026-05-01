const prisma = require('../utils/prisma');

const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await prisma.message.findMany({
      where: { roomId },
      include: {
        user: { select: { firstname: true, lastname: true, avatar: true } },
        reactions: true,
        file: true,
        poll: true,
        snippet: true
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des messages.' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, type, parentId } = req.body;

    const message = await prisma.message.create({
      data: {
        content,
        type: type || 'TEXT',
        roomId,
        userId: req.user.id,
        parentId
      },
      include: {
        user: { select: { firstname: true, lastname: true, avatar: true } }
      }
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message.' });
  }
};

const toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    const existingReaction = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji }
      }
    });

    if (existingReaction) {
      await prisma.reaction.delete({
        where: { id: existingReaction.id }
      });
      res.json({ message: 'Réaction retirée.' });
    } else {
      await prisma.reaction.create({
        data: { messageId, userId, emoji }
      });
      res.json({ message: 'Réaction ajoutée.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la gestion de la réaction.' });
  }
};

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier téléchargé.' });
    }

    res.json({
      originalName: req.file.originalname,
      storedName: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du téléchargement du fichier.' });
  }
};

module.exports = {
  getRoomMessages,
  sendMessage,
  toggleReaction,
  uploadFile
};
