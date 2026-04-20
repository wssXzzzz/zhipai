# 德州扑克联机对战

基于 Node.js + Socket.IO 的有限注德州扑克（Limit Hold'em）联机对战游戏。

## 游戏规则

- **玩家数**：2-4人
- **下注结构**：有限注（每轮下注金额固定）
- **游戏流程**：Pre-flop → Flop → Turn → River → 摊牌
- **牌型大小**：皇家同花顺 > 同花顺 > 四条 > 葫芦 > 同花 > 顺子 > 三条 > 两对 > 一对 > 高牌

## 启动

### 1. 安装依赖

```bash
cd zhipai
npm install
```

### 2. 启动服务器

```bash
npm start
```

或直接用 node：

```bash
node server/index.js
```

服务器启动后，打开浏览器访问：**http://localhost:12315**

## 退出

关闭服务器：

```bash
taskkill /F /IM node.exe
```

## 功能

- [x] 用户注册/登录
- [x] 创建私人房间（可选密码保护）
- [x] 加入房间
- [x] 完整德州扑克游戏流程
- [x] 实时多玩家同步
- [x] 牌型判断与结算

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | HTML5 + CSS3 + JavaScript |
| 实时通信 | Socket.IO |
| 后端 | Node.js + Express |
| 数据库 | SQLite (sql.js) |
| 认证 | JWT |

## 项目结构

```
zhipai/
├── server/
│   ├── index.js           # 服务端入口
│   ├── game/
│   │   ├── BotAI.js       # 机器人AI
│   │   ├── CardDeck.js    # 牌组管理
│   │   ├── PokerGame.js   # 德州扑克核心规则
│   │   └── Room.js        # 房间管理
│   ├── routes/
│   │   ├── auth.js        # 认证接口
│   │   └── room.js        # 房间接口
│   ├── models/
│   │   └── db.js          # 数据库
│   └── middleware/
│       └── auth.js        # JWT中间件
├── public/                # 前端静态文件
├── data/                  # SQLite数据库文件
└── package.json
```

## API 接口

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/user` - 获取当前用户

### 房间
- `POST /api/room/create` - 创建房间
- `POST /api/room/join` - 加入房间
- `GET /api/room/list` - 房间列表
- `GET /api/room/:roomId` - 获取房间信息
- `POST /api/room/:roomId/start` - 开始游戏
- `POST /api/room/:roomId/action` - 玩家动作（跟注/加注/弃牌等）
