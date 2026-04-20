let token = localStorage.getItem('token');
let currentUser = null;

const API_BASE = '/api';

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      document.getElementById('auth-error').textContent = data.error;
      return;
    }
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    showLobby();
  } catch (err) {
    document.getElementById('auth-error').textContent = '登录失败';
  }
}

async function register() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      document.getElementById('auth-error').textContent = data.error;
      return;
    }
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    showLobby();
  } catch (err) {
    document.getElementById('auth-error').textContent = '注册失败';
  }
}

async function checkAuth() {
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/auth/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      showLobby();
    }
  } catch (err) {
    console.error('Auth check failed');
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('lobby-section').classList.add('hidden');
}

function showLobby() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('lobby-section').classList.remove('hidden');
  document.getElementById('user-display').textContent = `${currentUser.username} (${currentUser.chips} 筹码)`;
  loadRooms();
  setInterval(loadRooms, 5000);
}

async function loadRooms() {
  try {
    const res = await fetch(`${API_BASE}/room/list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    renderRooms(data.rooms);
  } catch (err) {
    console.error('Failed to load rooms');
  }
}

function renderRooms(rooms) {
  const container = document.getElementById('rooms-container');
  if (rooms.length === 0) {
    container.innerHTML = '<p>暂无等待中的房间</p>';
    return;
  }
  container.innerHTML = rooms.map(room => `
    <div class="room-item" onclick="joinRoomById('${room.id}')">
      <h3>房间 ${room.id}</h3>
      <p>玩家: ${room.playerCount}/4 | 大盲注: ${room.bigBlind}</p>
      <p>${room.hasPassword ? '🔒 有密码' : '无需密码'}</p>
    </div>
  `).join('');
}

async function createRoom() {
  const password = document.getElementById('room-password').value;
  const bigBlind = parseInt(document.getElementById('big-blind').value) || 10;
  const buyIn = parseInt(document.getElementById('buy-in').value) || 1000;
  try {
    const res = await fetch(`${API_BASE}/room/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ password: password || null, bigBlind, buyIn })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    window.location.href = `room.html?roomId=${data.room.id}`;
  } catch (err) {
    alert('创建房间失败');
  }
}

async function joinRoom() {
  const roomId = document.getElementById('join-room-id').value.toUpperCase();
  const password = document.getElementById('join-room-password').value;
  if (!roomId) return;
  try {
    const res = await fetch(`${API_BASE}/room/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ roomId, password })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    window.location.href = `room.html?roomId=${data.room.id}`;
  } catch (err) {
    alert('加入房间失败');
  }
}

async function joinRoomById(roomId) {
  const password = prompt('请输入房间密码（无密码则直接回车）');
  try {
    const res = await fetch(`${API_BASE}/room/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ roomId, password: password || null })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    window.location.href = `room.html?roomId=${data.room.id}`;
  } catch (err) {
    alert('加入房间失败');
  }
}

checkAuth();