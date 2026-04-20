class BotAI {
  constructor(playerId, username) {
    this.playerId = playerId;
    this.username = username;
    this.aggressiveness = 0.5;
  }

  decideAction(gameState) {
    const player = gameState.players.find(p => p.id === this.playerId);
    if (!player || player.folded || player.allIn) {
      return { action: 'fold' };
    }

    const toCall = gameState.currentBet - player.bet;
    const handStrength = this.evaluateHandStrength(player.holeCards, gameState.communityCards);
    const potOdds = toCall > 0 ? toCall / (gameState.pot + toCall) : 0;

    if (handStrength > 0.8) {
      if (toCall === 0) {
        return { action: 'check' };
      }
      return { action: 'call' };
    }

    if (handStrength > 0.6) {
      if (toCall === 0) {
        return { action: 'check' };
      }
      if (potOdds < 0.3) {
        return { action: 'call' };
      }
      if (Math.random() < this.aggressiveness) {
        return { action: 'raise', amount: this.calculateRaiseAmount(gameState, player) };
      }
      return { action: 'call' };
    }

    if (handStrength > 0.3) {
      if (toCall === 0) {
        return { action: 'check' };
      }
      if (potOdds < 0.2) {
        return { action: 'call' };
      }
      return { action: 'fold' };
    }

    if (toCall === 0) {
      return { action: 'check' };
    }

    return { action: potOdds < 0.15 ? 'call' : 'fold' };
  }

  evaluateHandStrength(holeCards, communityCards) {
    if (!holeCards || holeCards.length === 0) return 0;

    const allCards = [...holeCards, ...communityCards];
    const ranks = allCards.map(c => c.value).sort((a, b) => b - a);
    const suits = allCards.map(c => c.suit);

    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    const isFlush = suits.length >= 5 && new Set(suits).size === 1;
    const isStraight = this.checkStraight(ranks);

    if (counts[0] === 4) return 0.95;
    if (counts[0] === 3 && counts[1] === 2) return 0.9;
    if (isFlush || isStraight) return 0.8;
    if (counts[0] === 3) return 0.7;
    if (counts[0] === 2 && counts[1] === 2) return 0.5;
    if (counts[0] === 2) return 0.35;

    const highCards = ranks.slice(0, Math.min(3, ranks.length));
    const avgHigh = highCards.reduce((a, b) => a + b, 0) / highCards.length;
    return avgHigh / 14 * 0.3;
  }

  checkStraight(ranks) {
    const unique = [...new Set(ranks)].sort((a, b) => b - a);
    if (unique.length < 5) return false;
    for (let i = 0; i <= unique.length - 5; i++) {
      if (unique[i] - unique[i + 4] === 4) return true;
    }
    if (unique[0] === 14 && unique.includes(5) && unique.includes(4) && unique.includes(3) && unique.includes(2)) {
      return true;
    }
    return false;
  }

  calculateRaiseAmount(gameState, player) {
    const minRaise = gameState.currentBet + gameState.bigBlind;
    const maxRaise = player.chips;
    const baseAmount = minRaise * 2;
    return Math.min(baseAmount, maxRaise);
  }
}

module.exports = { BotAI };