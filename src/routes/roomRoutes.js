const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/public/classes', roomController.getPublicRooms);
router.get('/', authMiddleware, roomController.getAllRooms);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'MODERATOR']), roomController.createRoom);
router.get('/:id', authMiddleware, roomController.getRoomById);
router.post('/:id/join', authMiddleware, roomController.joinRoom);
router.post('/:id/leave', authMiddleware, roomController.leaveRoom);

module.exports = router;
