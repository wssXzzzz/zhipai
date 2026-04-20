function renderCard(card) {
  if (!card) return '<div class="card"></div>';
  const redClass = (card.suit === '♥' || card.suit === '♦') ? 'red' : '';
  return `<div class="card ${redClass}">${card.rank}${card.suit}</div>`;
}

function renderCards(cards) {
  if (!cards || cards.length === 0) return '';
  return cards.map(c => renderCard(c)).join('');
}

function formatCard(card) {
  if (!card) return '';
  return `${card.rank}${card.suit}`;
}

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

function getRankCounts(ranks) {
  const counts = {};
  ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
  return Object.values(counts).sort((a, b) => b - a);
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
    return { rank: HAND_RANKS.TWO_PAIR, name: '两对', value: 30 + rankCounts[2] / 100 + rankCounts[1] / 1000 };
  }
  if (rankCounts[0] === 2) {
    return { rank: HAND_RANKS.ONE_PAIR, name: '一对', value: 20 + rankCounts[1] / 100 };
  }
  return { rank: HAND_RANKS.HIGH_CARD, name: '高牌', value: ranks[0] / 100 };
}