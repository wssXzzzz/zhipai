const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { initDB } = require('./models/db');
const { RoomManager } = require('./game/Room');
const authRoutes = require('./routes/auth');
const { router: roomRoutes, setRoomManager } = require('./routes/room');

const PORT = process.env.PORT || 8888;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const roomManager = new RoomManager();
setRoomManager(roomManager);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/auth', authRoutes);
app.use('/api/room', roomRoutes);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    const room = roomManager.getRoom(roomId);
    if (room) {
      io.to(roomId).emit('room-update', room.getRoomState());
    }
  });

  socket.on('player-action', (data) => {
    const { roomId, action, raiseAmount } = data;
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const result = room.playerAction(socket.userId, action, raiseAmount);
    if (result.success) {
      io.to(roomId).emit('room-update', room.getRoomState());
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const start = async () => {
  try {
    await initDB();
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();