const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Stats et dashboard
router.get('/stats', authMiddleware, roleMiddleware(['ADMIN']), adminController.getStats);

// Gestion des utilisateurs
router.get('/users', authMiddleware, roleMiddleware(['ADMIN']), adminController.getUsers);
router.put('/users/:userId/role', authMiddleware, roleMiddleware(['ADMIN']), adminController.updateUserRole);

// Modération
router.get('/moderation/logs', authMiddleware, roleMiddleware(['ADMIN']), adminController.getModerationLogs);
router.delete('/messages/:messageId', authMiddleware, roleMiddleware(['ADMIN']), adminController.deleteMessage);

// Annonces globales
router.post('/announcements', authMiddleware, roleMiddleware(['ADMIN']), adminController.sendGlobalAnnouncement);

module.exports = router;
