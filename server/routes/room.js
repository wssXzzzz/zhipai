const express = require('express');
const { run } = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
let roomManager;

const setRoomManager = (rm) => {
  roomManager = rm;
};

router.post('/create', authMiddleware, async (req, res) => {
  const { password, bigBlind, buyIn } = req.body;
  const options = {
    password: password || null,
    bigBlind: bigBlind || 10,
    buyIn: buyIn || 1000
  };
  const room = roomManager.createRoom(req.userId, req.username, options);
  room.addPlayer(req.userId, req.username);
  await run(
    'INSERT INTO rooms (id, password, owner_id, big_blind, status) VALUES (?, ?, ?, ?, ?)',
    [room.id, options.password, req.userId, options.bigBlind, 'waiting']
  );
  res.json({ room: room.getRoomState() });
});

router.post('/join', authMiddleware, (req, res) => {
  const { roomId, password } = req.body;
  const result = roomManager.getRoomByIdAndPassword(roomId, password);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  const room = result.room;
  const addResult = room.addPlayer(req.userId, req.username);
  if (!addResult.success) {
    return res.status(400).json({ error: addResult.message });
  }
  res.json({ room: room.getRoomState() });
});

router.get('/list', authMiddleware, (req, res) => {
  const rooms = roomManager.getRooms().filter(r => r.status === 'waiting');
  res.json({ rooms });
});

router.get('/:roomId', authMiddleware, (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({ room: room.getRoomState() });
});

router.post('/:roomId/leave', authMiddleware, (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  const result = room.removePlayer(req.userId);
  if (result === 'empty') {
    roomManager.deleteRoom(req.params.roomId);
  }
  res.json({ success: true });
});

router.post('/:roomId/start', authMiddleware, (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  if (room.ownerId !== req.userId) {
    return res.status(403).json({ error: 'Only the owner can start the game' });
  }
  const result = room.startGame();
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ room: room.getRoomState() });
});

router.post('/:roomId/action', authMiddleware, (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  const { action, raiseAmount } = req.body;
  const result = room.playerAction(req.userId, action, raiseAmount);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ room: room.getRoomState() });
});

router.post('/:roomId/add-bot', authMiddleware, (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  if (room.ownerId !== req.userId) {
    return res.status(403).json({ error: 'Only the owner can add bots' });
  }
  const result = room.addBot();
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ room: room.getRoomState(), bot: { id: result.botId, name: result.botName } });
});

router.post('/:roomId/remove-bot/:botId', authMiddleware, (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  if (room.ownerId !== req.userId) {
    return res.status(403).json({ error: 'Only the owner can remove bots' });
  }
  room.removeBot(req.params.botId);
  res.json({ room: room.getRoomState() });
});

module.exports = { router, setRoomManager };