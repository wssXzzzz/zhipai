const { v4: uuidv4 } = require('uuid');
const { PokerGame } = require('./PokerGame');

const ROOM_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished'
};

class Room {
  constructor(id, ownerId, ownerName, options = {}) {
    this.id = id;
    this.ownerId = ownerId;
    this.players = [];
    this.status = ROOM_STATUS.WAITING;
    this.password = options.password || null;
    this.bigBlind = options.bigBlind || 10;
    this.buyIn = options.buyIn || 1000;
    this.game = null;
    this.createdAt = new Date();
  }

  addPlayer(playerId, username, chips = 1000) {
    if (this.status !== ROOM_STATUS.WAITING) return { success: false, message: 'Game already started' };
    if (this.players.length >= 4) return { success: false, message: 'Room is full' };
    if (this.players.find(p => p.id === playerId)) return { success: false, message: 'Already in room' };

    this.players.push({ id: playerId, username, chips, ready: false });
    return { success: true };
  }

  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
    if (this.players.length === 0) return 'empty';
    if (this.ownerId === playerId && this.players.length > 0) {
      this.ownerId = this.players[0].id;
    }
    return this.players.length > 0 ? 'occupied' : 'empty';
  }

  setReady(playerId, ready) {
    const player = this.players.find(p => p.id === playerId);
    if (player) player.ready = ready;
  }

  startGame() {
    if (this.players.length < 2) return { success: false, message: 'Need at least 2 players' };
    if (this.status === ROOM_STATUS.PLAYING) return { success: false, message: 'Game already in progress' };

    this.status = ROOM_STATUS.PLAYING;
    this.game = new PokerGame(this.bigBlind, 2, 4);

    for (const player of this.players) {
      this.game.addPlayer(player.id, player.username, this.buyIn);
    }

    this.game.start();
    return { success: true, gameState: this.game.getGameState() };
  }

  playerAction(playerId, action, raiseAmount = 0) {
    if (!this.game || this.status !== ROOM_STATUS.PLAYING) {
      return { success: false, message: 'No active game' };
    }

    const result = this.game.playerAction(playerId, action, raiseAmount);
    if (result.success) {
      if (this.game.isBettingRoundComplete()) {
        this.game.endPhase();
      }
    }
    return result;
  }

  getRoomState() {
    return {
      id: this.id,
      ownerId: this.ownerId,
      players: this.players.map(p => ({ id: p.id, username: p.username, chips: p.chips, ready: p.ready })),
      status: this.status,
      bigBlind: this.bigBlind,
      buyIn: this.buyIn,
      hasPassword: !!this.password,
      gameState: this.game ? this.game.getGameState() : null
    };
  }
}

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(ownerId, ownerName, options = {}) {
    const id = uuidv4().substring(0, 8).toUpperCase();
    const room = new Room(id, ownerId, ownerName, options);
    this.rooms.set(id, room);
    return room;
  }

  getRoom(id) {
    return this.rooms.get(id);
  }

  getRoomByIdAndPassword(id, password) {
    const room = this.rooms.get(id);
    if (!room) return { success: false, message: 'Room not found' };
    if (room.password && room.password !== password) {
      return { success: false, message: 'Incorrect password' };
    }
    return { success: true, room };
  }

  deleteRoom(id) {
    return this.rooms.delete(id);
  }

  getRooms() {
    return Array.from(this.rooms.values()).map(r => ({
      id: r.id,
      ownerId: r.ownerId,
      playerCount: r.players.length,
      status: r.status,
      hasPassword: !!r.password,
      bigBlind: r.bigBlind
    }));
  }
}

module.exports = { Room, RoomManager, ROOM_STATUS };