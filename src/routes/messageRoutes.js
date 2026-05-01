const express = require('express');
const router = express.Router({ mergeParams: true });
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../utils/multer');

router.get('/', authMiddleware, messageController.getRoomMessages);
router.post('/', authMiddleware, messageController.sendMessage);
router.put('/:messageId/react', authMiddleware, messageController.toggleReaction);
router.post('/upload', authMiddleware, upload.single('file'), messageController.uploadFile);

module.exports = router;
