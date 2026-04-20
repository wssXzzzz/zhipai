let token = localStorage.getItem('token');
let currentUser = null;
let roomId = null;
let socket = null;
let gameState = null;
let isMyTurn = false;

const API_BASE = '/api';

async function init() {
  const params = new URLSearchParams(window.location.search);
  roomId = params.get('roomId');
  if (!roomId) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      window.location.href = 'index.html';
      return;
    }
    const data = await res.json();
    currentUser = data.user;
  } catch (err) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('room-id').textContent = roomId;

  socket = io();
  socket.emit('join-room', roomId);

  socket.on('room-update', (state) => {
    gameState = state;
    renderGame();
  });

  loadRoom();
  setInterval(loadRoom, 3000);
}

async function loadRoom() {
  try {
    const res = await fetch(`${API_BASE}/room/${roomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      gameState = data.room;
      renderGame();
    }
  } catch (err) {
    console.error('Failed to load room');
  }
}

function renderGame() {
  if (!gameState) return;

  renderPlayers();
  renderCommunityCards();
  renderPotInfo();
  renderActions();
  renderBotControls();
}

function renderPlayers() {
  const container = document.getElementById('players-area');
  const players = gameState.players || [];

  container.innerHTML = players.map(p => {
    const isMe = p.id === currentUser.id;
    const activeClass = isMyTurn && isMe ? 'active' : '';
    const foldedClass = p.folded ? 'folded' : '';
    let cardsHtml;

    if (isMe) {
      cardsHtml = `<div class="player-cards">${renderCards(p.holeCards)}</div>`;
    } else if (p.folded) {
      cardsHtml = '<div class="player-cards">已弃牌</div>';
    } else if (p.isBot) {
      cardsHtml = '<div class="player-cards">🂠 🂠</div>';
    } else {
      cardsHtml = '<div class="player-cards">🂠 🂠</div>';
    }

    return `
      <div class="player-card ${activeClass} ${foldedClass}">
        <div class="player-name">${p.username}${isMe ? ' (你)' : ''}${p.isBot ? '<span class="bot-badge">BOT</span>' : ''}</div>
        <div class="player-chips">筹码: ${p.chips}</div>
        ${cardsHtml}
      </div>
    `;
  }).join('');
}

function renderBotControls() {
  let container = document.getElementById('bot-controls');
  if (!container) {
    container = document.createElement('div');
    container.id = 'bot-controls';
    container.style.cssText = 'text-align:center;margin:15px 0;';
    const actionButtons = document.getElementById('action-buttons');
    actionButtons.parentNode.insertBefore(container, actionButtons);
  }

  if (gameState.status !== 'waiting' || String(gameState.ownerId) !== String(currentUser.id)) {
    container.innerHTML = '';
    return;
  }

  const playerCount = gameState.players.length;
  if (playerCount >= 4) {
    container.innerHTML = '<p style="color:#888;">房间已满</p>';
    return;
  }

  container.innerHTML = `
    <button onclick="addBot()" class="secondary" style="background:#8b5cf6;color:#fff;">+ 添加机器人</button>
  `;
}

async function addBot() {
  try {
    const res = await fetch(`${API_BASE}/room/${roomId}/add-bot`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      gameState = data.room;
      renderGame();
    } else {
      alert(data.error);
    }
  } catch (err) {
    console.error('Add bot failed');
  }
}

async function removeBot(botId) {
  try {
    const res = await fetch(`${API_BASE}/room/${roomId}/remove-bot/${botId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      gameState = data.room;
      renderGame();
    }
  } catch (err) {
    console.error('Remove bot failed');
  }
}

function renderCommunityCards() {
  const container = document.getElementById('community-cards');
  const cards = gameState.gameState?.communityCards || [];
  container.innerHTML = renderCards(cards);
}

function renderPotInfo() {
  const gs = gameState.gameState;
  document.getElementById('pot-amount').textContent = gs?.pot || 0;
  document.getElementById('current-bet').textContent = gs?.currentBet || 0;
}

function renderActions() {
  const gs = gameState.gameState;
  const buttons = document.getElementById('action-buttons');
  const controls = document.getElementById('raise-controls');

  if (!gs || gs.phase === 'waiting') {
    buttons.classList.add('hidden');
    controls.classList.add('hidden');

    if (String(gameState.ownerId) === String(currentUser.id) && gs && gs.players?.length >= 2) {
      buttons.classList.remove('hidden');
      buttons.innerHTML = `<button onclick="startGame()" class="action-btn raise">开始游戏</button>`;
    }
    return;
  }

  if (gs.phase === 'showdown') {
    buttons.classList.add('hidden');
    controls.classList.add('hidden');
    return;
  }

  const currentPlayer = gs.players[gs.currentPlayerIndex];
  isMyTurn = currentPlayer?.id === currentUser.id;

  if (!isMyTurn) {
    buttons.classList.add('hidden');
    controls.classList.add('hidden');
    return;
  }

  buttons.classList.remove('hidden');
  controls.classList.add('hidden');

  const toCall = gs.currentBet - (currentPlayer?.bet || 0);

  buttons.innerHTML = `
    <button onclick="playerAction('fold')" class="action-btn fold">弃牌</button>
    ${toCall === 0 ?
      '<button onclick="playerAction(\'check\')" class="action-btn check">过牌</button>' :
      `<button onclick="playerAction('call')" class="action-btn call">跟注 ${toCall}</button>`
    }
    <button onclick="showRaiseControls()" class="action-btn raise">加注</button>
  `;
}

function showRaiseControls() {
  const controls = document.getElementById('raise-controls');
  controls.classList.remove('hidden');
  const gs = gameState.gameState;
  const minRaise = gs.currentBet + gs.bigBlind;
  document.getElementById('raise-amount').value = minRaise;
  document.getElementById('raise-amount').min = minRaise;
}

function cancelRaise() {
  document.getElementById('raise-controls').classList.add('hidden');
}

async function confirmRaise() {
  const amount = parseInt(document.getElementById('raise-amount').value);
  if (!amount) return;
  await performAction('raise', amount);
  document.getElementById('raise-controls').classList.add('hidden');
}

async function playerAction(action) {
  await performAction(action, 0);
}

async function performAction(action, raiseAmount) {
  try {
    const res = await fetch(`${API_BASE}/room/${roomId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ action, raiseAmount })
    });
    const data = await res.json();
    if (res.ok) {
      gameState = data.room;
      renderGame();
    } else {
      alert(data.error);
    }
  } catch (err) {
    console.error('Action failed');
  }
}

async function startGame() {
  try {
    const res = await fetch(`${API_BASE}/room/${roomId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      gameState = data.room;
      renderGame();
    } else {
      alert(data.error);
    }
  } catch (err) {
    console.error('Start game failed');
  }
}

async function leaveRoom() {
  try {
    await fetch(`${API_BASE}/room/${roomId}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    console.error('Leave room failed');
  }
  window.location.href = 'index.html';
}

init();