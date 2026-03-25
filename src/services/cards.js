const STORAGE_KEY = 'levelup_cards_v1';

export function getStoredCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveStoredCards(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function addStoredCard(card) {
  const list = getStoredCards();
  list.push(card);
  saveStoredCards(list);
  return list;
}
