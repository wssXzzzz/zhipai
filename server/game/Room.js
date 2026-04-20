const { v4: uuidv4 } = require('uuid');
const { PokerGame } = require('./PokerGame');
const { BotAI } = require('./BotAI');

const ROOM_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished'
};

const BOT_NAMES = ['小智', '小明', '小红', '阿强', '小美', '大熊', '小白', '老王'];
let botIdCounter = 1000;

class Room {
  constructor(id, ownerId, ownerName, options = {}) {
    this.id = id;
    this.ownerId = ownerId;
    this.players = [];
    this.bots = [];
    this.status = ROOM_STATUS.WAITING;
    this.password = options.password || null;
    this.bigBlind = options.bigBlind || 10;
    this.buyIn = options.buyIn || 1000;
    this.game = null;
    this.createdAt = new Date();
    this.botInterval = null;
  }

  addPlayer(playerId, username, chips = 1000) {
    if (this.status !== ROOM_STATUS.WAITING) return { success: false, message: 'Game already started' };
    if (this.players.length >= 4) return { success: false, message: 'Room is full' };
    if (this.players.find(p => p.id === playerId)) return { success: false, message: 'Already in room' };

    this.players.push({ id: playerId, username, chips, ready: false, isBot: false });
    return { success: true };
  }

  addBot() {
    if (this.status !== ROOM_STATUS.WAITING) return { success: false, message: 'Game already started' };
    const totalPlayers = this.players.length + this.bots.length;
    if (totalPlayers >= 4) return { success: false, message: 'Room is full' };

    const botId = `bot_${botIdCounter++}`;
    const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const bot = new BotAI(botId, botName);
    this.bots.push({ id: botId, username: botName, ai: bot, chips: this.buyIn });
    return { success: true, botId, botName };
  }

  removeBot(botId) {
    this.bots = this.bots.filter(b => b.id !== botId);
  }

  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
    if (this.players.length === 0 && this.bots.length === 0) return 'empty';
    if (this.ownerId === playerId && this.players.length > 0) {
      this.ownerId = this.players[0].id;
    }
    return this.players.length > 0 || this.bots.length > 0 ? 'occupied' : 'empty';
  }

  setReady(playerId, ready) {
    const player = this.players.find(p => p.id === playerId);
    if (player) player.ready = ready;
  }

  getAllPlayers() {
    return [
      ...this.players.map(p => ({ ...p, isBot: false })),
      ...this.bots.map(b => ({ id: b.id, username: b.username, chips: b.chips, ready: true, isBot: true }))
    ];
  }

  startGame() {
    const allPlayers = this.getAllPlayers();
    if (allPlayers.length < 2) return { success: false, message: 'Need at least 2 players' };
    if (this.status === ROOM_STATUS.PLAYING) return { success: false, message: 'Game already in progress' };

    this.status = ROOM_STATUS.PLAYING;
    this.game = new PokerGame(this.bigBlind, 2, 4);

    for (const player of allPlayers) {
      this.game.addPlayer(player.id, player.username, player.chips);
    }

    this.game.start();

    if (this.botInterval) {
      clearInterval(this.botInterval);
      this.botInterval = null;
    }

    this.botInterval = setInterval(() => this.runBotActions(), 2000);

    return { success: true, gameState: this.game.getGameState() };
  }

  runBotActions() {
    if (!this.game || this.status !== ROOM_STATUS.PLAYING) {
      if (this.botInterval) {
        clearInterval(this.botInterval);
        this.botInterval = null;
      }
      return;
    }

    const gameState = this.game.getGameState();
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    const bot = this.bots.find(b => b.id === currentPlayer.id);
    if (!bot) return;

    if (currentPlayer.folded || currentPlayer.allIn) {
      this.game.advancePlayer();
      return;
    }

    const action = bot.ai.decideAction(gameState);

    if (action.action === 'raise') {
      this.game.playerAction(bot.id, 'raise', action.amount);
    } else {
      this.game.playerAction(bot.id, action.action);
    }

    if (this.game.isBettingRoundComplete()) {
      this.game.endPhase();
    }
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
      players: this.getAllPlayers().map(p => ({
        id: p.id,
        username: p.username,
        chips: p.chips,
        ready: p.ready,
        isBot: p.isBot
      })),
      status: this.status,
      bigBlind: this.bigBlind,
      buyIn: this.buyIn,
      hasPassword: !!this.password,
      gameState: this.game ? this.game.getGameState() : null
    };
  }

  destroy() {
    if (this.botInterval) {
      clearInterval(this.botInterval);
      this.botInterval = null;
    }
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
    const room = this.rooms.get(id);
    if (room) {
      room.destroy();
    }
    return this.rooms.delete(id);
  }

  getRooms() {
    return Array.from(this.rooms.values()).map(r => ({
      id: r.id,
      ownerId: r.ownerId,
      playerCount: r.getAllPlayers().length,
      status: r.status,
      hasPassword: !!r.password,
      bigBlind: r.bigBlind
    }));
  }
}

module.exports = { Room, RoomManager, ROOM_STATUS };