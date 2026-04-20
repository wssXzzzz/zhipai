const { CardDeck } = require('./CardDeck');

const HAND_RANKS = {
  HIGH_CARD: 1,
  ONE_PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10
};

function evaluateHand(cards) {
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const ranks = sorted.map(c => c.value);
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = checkStraight(ranks);
  const rankCounts = getRankCounts(ranks);

  if (isFlush && isStraight && ranks[0] === 14 && ranks[1] === 13) {
    return { rank: HAND_RANKS.ROYAL_FLUSH, name: '皇家同花顺', value: 100 };
  }
  if (isFlush && isStraight) {
    return { rank: HAND_RANKS.STRAIGHT_FLUSH, name: '同花顺', value: 90 + ranks[0] / 100 };
  }
  if (rankCounts[0] === 4) {
    return { rank: HAND_RANKS.FOUR_OF_A_KIND, name: '四条', value: 80 + rankCounts[1] / 100 };
  }
  if (rankCounts[0] === 3 && rankCounts[1] === 2) {
    return { rank: HAND_RANKS.FULL_HOUSE, name: '葫芦', value: 70 + rankCounts[0] / 100 };
  }
  if (isFlush) {
    return { rank: HAND_RANKS.FLUSH, name: '同花', value: 60 + ranks[0] / 100 };
  }
  if (isStraight) {
    return { rank: HAND_RANKS.STRAIGHT, name: '顺子', value: 50 + ranks[0] / 100 };
  }
  if (rankCounts[0] === 3) {
    return { rank: HAND_RANKS.THREE_OF_A_KIND, name: '三条', value: 40 + rankCounts[1] / 100 };
  }
  if (rankCounts[0] === 2 && rankCounts[1] === 2) {
    return { rank: HAND_RANKS.TWO_PAIR, name: '两对', value: 30 + (rankCounts[2] || 0) / 100 + rankCounts[1] / 1000 };
  }
  if (rankCounts[0] === 2) {
    return { rank: HAND_RANKS.ONE_PAIR, name: '一对', value: 20 + rankCounts[1] / 100 };
  }
  return { rank: HAND_RANKS.HIGH_CARD, name: '高牌', value: ranks[0] / 100 };
}

function checkStraight(ranks) {
  const unique = [...new Set(ranks)].sort((a, b) => b - a);
  if (unique.length !== 5) return false;
  if (unique[0] - unique[4] === 4) return true;
  if (unique[0] === 14 && unique[1] === 5 && unique[2] === 4 && unique[3] === 3 && unique[4] === 2) {
    return true;
  }
  return false;
}

function getRankCounts(ranks) {
  const counts = {};
  ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
  return Object.values(counts).sort((a, b) => b - a);
}

function compareHands(hand1, hand2) {
  if (hand1.rank !== hand2.rank) return hand1.rank > hand2.rank ? 1 : -1;
  return hand1.value > hand2.value ? 1 : hand1.value < hand2.value ? -1 : 0;
}

class PokerGame {
  constructor(bigBlind = 10, minPlayers = 2, maxPlayers = 4) {
    this.bigBlind = bigBlind;
    this.minPlayers = minPlayers;
    this.maxPlayers = maxPlayers;
    this.reset();
  }

  reset() {
    this.deck = new CardDeck();
    this.players = [];
    this.communityCards = [];
    this.currentDealerIndex = 0;
    this.currentPlayerIndex = 0;
    this.phase = 'waiting';
    this.pot = 0;
    this.currentBet = 0;
    this.bets = [];
    this.lastRaise = 0;
  }

  addPlayer(id, username, chips = 1000) {
    if (this.players.length >= this.maxPlayers) return false;
    this.players.push({ id, username, chips, holeCards: [], folded: false, allIn: false, bet: 0 });
    return true;
  }

  removePlayer(id) {
    this.players = this.players.filter(p => p.id !== id);
  }

  start() {
    if (this.players.length < this.minPlayers) return false;
    this.deck.reset();
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.bets = this.players.map(() => 0);
    this.players.forEach(p => {
      p.holeCards = [];
      p.folded = false;
      p.allIn = false;
      p.bet = 0;
    });
    this.phase = 'preflop';
    this.dealHoleCards();
    this.postBlinds();
    this.currentPlayerIndex = (this.currentDealerIndex + 3) % this.players.length;
    return true;
  }

  dealHoleCards() {
    for (let i = 0; i < 2; i++) {
      const cards = this.deck.deal(1);
      this.players[i % this.players.length].holeCards.push(cards[0]);
    }
  }

  postBlinds() {
    const sbIndex = (this.currentDealerIndex + 1) % this.players.length;
    const bbIndex = (this.currentDealerIndex + 2) % this.players.length;
    const sb = Math.floor(this.bigBlind / 2);
    const bb = this.bigBlind;
    this.players[sbIndex].chips -= sb;
    this.players[sbIndex].bet = sb;
    this.players[bbIndex].chips -= bb;
    this.players[bbIndex].bet = bb;
    this.pot += sb + bb;
    this.currentBet = bb;
  }

  getCurrentPlayer() {
    const activePlayers = this.players.filter(p => !p.folded && !p.allIn);
    let idx = this.currentPlayerIndex;
    while (activePlayers.every(p => p.id !== this.players[idx].id) || this.players[idx].folded || this.players[idx].allIn) {
      idx = (idx + 1) % this.players.length;
      if (this.players[idx].id === this.players[this.currentPlayerIndex].id) break;
    }
    return this.players[idx];
  }

  playerAction(playerId, action, raiseAmount = 0) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex !== this.currentPlayerIndex) return { success: false, message: 'Not your turn' };

    const player = this.players[playerIndex];
    const toCall = this.currentBet - player.bet;

    switch (action) {
      case 'fold':
        player.folded = true;
        break;
      case 'check':
        if (toCall > 0) return { success: false, message: 'Cannot check, need to call' };
        break;
      case 'call':
        const callAmount = Math.min(toCall, player.chips);
        player.chips -= callAmount;
        player.bet += callAmount;
        this.pot += callAmount;
        if (player.chips === 0) player.allIn = true;
        break;
      case 'raise':
        const minRaise = this.currentBet + this.lastRaise;
        const totalBet = raiseAmount || minRaise;
        if (totalBet < minRaise) return { success: false, message: 'Raise too small' };
        const raiseTotal = Math.min(totalBet, player.chips + player.bet);
        const actualRaise = raiseTotal - player.bet;
        player.chips -= actualRaise;
        player.bet = raiseTotal;
        this.pot += actualRaise;
        this.currentBet = raiseTotal;
        this.lastRaise = raiseTotal - (totalBet - this.lastRaise);
        if (player.chips === 0) player.allIn = true;
        break;
    }

    this.advancePlayer();
    return { success: true };
  }

  advancePlayer() {
    let attempts = 0;
    let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
    while (attempts < this.players.length) {
      const p = this.players[nextIndex];
      if (!p.folded && !p.allIn) {
        this.currentPlayerIndex = nextIndex;
        return;
      }
      nextIndex = (nextIndex + 1) % this.players.length;
      attempts++;
    }
    this.endPhase();
  }

  endPhase() {
    const activePlayers = this.players.filter(p => !p.folded);
    if (activePlayers.length === 1) {
      this.awardPot([activePlayers[0]]);
      this.phase = 'showdown';
      return;
    }

    switch (this.phase) {
      case 'preflop':
        this.phase = 'flop';
        this.deck.deal(1);
        this.communityCards.push(...this.deck.deal(3));
        this.currentBet = 0;
        this.bets = this.players.map(() => 0);
        this.lastRaise = 0;
        break;
      case 'flop':
        this.phase = 'turn';
        this.communityCards.push(...this.deck.deal(1));
        this.currentBet = 0;
        this.bets = this.players.map(() => 0);
        this.lastRaise = 0;
        break;
      case 'turn':
        this.phase = 'river';
        this.communityCards.push(...this.deck.deal(1));
        this.currentBet = 0;
        this.bets = this.players.map(() => 0);
        this.lastRaise = 0;
        break;
      case 'river':
        this.phase = 'showdown';
        this.showdown();
        break;
    }
  }

  showdown() {
    const activePlayers = this.players.filter(p => !p.folded);
    const results = activePlayers.map(p => {
      const bestHand = this.evaluateBestHand(p.holeCards);
      return { player: p, hand: bestHand };
    });
    results.sort((a, b) => compareHands(b.hand, a.hand));
    const winners = [results[0].player];
    for (let i = 1; i < results.length; i++) {
      if (results[i].hand.rank === results[0].hand.rank && Math.abs(results[i].hand.value - results[0].hand.value) < 0.01) {
        winners.push(results[i].player);
      } else {
        break;
      }
    }
    this.awardPot(winners);
    return { results, winners: winners.map(p => p.id) };
  }

  evaluateBestHand(holeCards) {
    const allCards = [...holeCards, ...this.communityCards];
    let best = null;
    for (let i = 0; i < allCards.length - 4; i++) {
      for (let j = i + 1; j < allCards.length - 3; j++) {
        const hand = [allCards[i], allCards[j]];
        const remaining = allCards.filter((_, idx) => idx !== i && idx !== j);
        for (let k = 0; k < remaining.length - 2; k++) {
          const combo = [...hand, remaining[k], remaining[k + 1], remaining[k + 2]];
          const eval_result = evaluateHand(combo);
          if (!best || compareHands(eval_result, best) > 0) {
            best = eval_result;
          }
        }
      }
    }
    return best;
  }

  awardPot(winners) {
    const share = Math.floor(this.pot / winners.length);
    winners.forEach(w => w.chips += share);
    this.pot = 0;
  }

  isBettingRoundComplete() {
    const activePlayers = this.players.filter(p => !p.folded && !p.allIn);
    if (activePlayers.length <= 1) return true;
    return activePlayers.every(p => p.bet === this.currentBet);
  }

  getGameState() {
    return {
      phase: this.phase,
      pot: this.pot,
      currentBet: this.currentBet,
      communityCards: this.communityCards,
      players: this.players.map(p => ({
        id: p.id,
        username: p.username,
        chips: p.chips,
        holeCards: p.holeCards,
        folded: p.folded,
        allIn: p.allIn,
        bet: p.bet
      })),
      currentPlayerIndex: this.currentPlayerIndex,
      bigBlind: this.bigBlind
    };
  }
}

module.exports = { PokerGame, evaluateHand, compareHands, HAND_RANKS };