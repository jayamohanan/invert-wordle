// Ensure game initializes on page load
window.onload = () => {
  loadWordLists();
};
// Wordle Clone JS
const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
let answerList = [];
let guessList = [];
let answer = '';
let currentRow = 0;
let currentCol = 0;
let isGameOver = false;
let grid = [];
let lastFilled = { row: null, col: null };

async function loadWordLists() {
  try {
    const [answerRes, guessRes] = await Promise.all([
      fetch('answer-list.txt'),
      fetch('guess-list.txt')
    ]);
    if (!answerRes.ok || !guessRes.ok) throw new Error('Word list fetch failed');
    answerList = (await answerRes.text()).split(/\r?\n/).map(w => w.trim().toLowerCase()).filter(Boolean);
    guessList = (await guessRes.text()).split(/\r?\n/).map(w => w.trim().toLowerCase()).filter(Boolean);
    if (!answerList.length) throw new Error('No answers loaded');
    startGame();
  } catch (e) {
    showMessage('Error loading word lists.');
    renderGrid();
    renderKeyboard();
  }
}

function startGame() {
  answer = answerList[Math.floor(Math.random() * answerList.length)];
  currentRow = 0;
  currentCol = 0;
  isGameOver = false;
  grid = Array.from({ length: MAX_GUESSES }, () => Array(WORD_LENGTH).fill(''));
  lastFilled = { row: null, col: null };
  renderGrid();
  renderKeyboard();
}

function renderGrid() {
  const gridDiv = document.querySelector('.grid');
  if (!gridDiv) return;
  gridDiv.innerHTML = '';
  for (let r = 0; r < MAX_GUESSES; r++) {
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = document.createElement('div');
      tile.textContent = grid[r][c] || '';
      let classes = ['tile'];
      // Animate only the last filled cell
      if (lastFilled.row === r && lastFilled.col === c) {
        classes.push('filled');
      } else if (r === currentRow && c < currentCol && grid[r][c]) {
        // Add outline to previously entered letters in current row
        classes.push('filled-outline');
      }
      if (r < currentRow) {
        const result = getTileResult(r, c);
        classes.push(result);
      }
      tile.className = classes.join(' ');
      gridDiv.appendChild(tile);
    }
  }
}

function renderKeyboard() {
  const keyboard = document.querySelector('.keyboard');
  if (!keyboard) return;
  keyboard.innerHTML = '';
  const rows = [
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm'
  ];
  const keyStates = getKeyStates();
  rows.forEach((row, i) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'key-row';
    if (i === 2) {
      const enter = document.createElement('button');
      enter.className = 'key';
      enter.textContent = 'Enter';
      enter.onclick = () => handleKey('Enter');
      rowDiv.appendChild(enter);
    }
    for (const ch of row) {
      const key = document.createElement('button');
      key.className = 'key';
      key.textContent = ch;
      if (keyStates[ch]) key.classList.add(keyStates[ch]);
      key.onclick = () => handleKey(ch);
      rowDiv.appendChild(key);
    }
    if (i === 2) {
      const del = document.createElement('button');
      del.className = 'key';
      del.innerHTML = '⌫';
      del.onclick = () => handleKey('Backspace');
      rowDiv.appendChild(del);
    }
    keyboard.appendChild(rowDiv);
  });
}

function getKeyStates() {
  const states = {};
  for (let r = 0; r < currentRow; r++) {
    const guess = grid[r].join('').toLowerCase();
    for (let i = 0; i < guess.length; i++) {
      const ch = guess[i];
      if (answer[i] === ch) {
        states[ch] = 'correct';
      } else if (answer.includes(ch)) {
        if (states[ch] !== 'correct') states[ch] = 'present';
      } else {
        if (!states[ch]) states[ch] = 'absent';
      }
    }
  }
  return states;
}

function getTileResult(r, c) {
  const guess = grid[r].join('').toLowerCase();
  if (answer[c] === guess[c]) return 'correct';
  if (answer.includes(guess[c])) return 'present';
  return 'absent';
}

function handleKey(key) {
  if (isGameOver) return;
  if (key === 'Enter') {
    submitGuess();
    return;
  }
  if (key === 'Backspace' || key === 'Del') {
    if (currentCol > 0) {
      currentCol--;
      grid[currentRow][currentCol] = '';
      lastFilled = { row: null, col: null };
      renderGrid();
    }
    return;
  }
  if (/^[a-zA-Z]$/.test(key) && currentCol < WORD_LENGTH) {
    grid[currentRow][currentCol] = key.toUpperCase();
    lastFilled = { row: currentRow, col: currentCol };
    currentCol++;
    renderGrid();
  }
}

function revealRow(row) {
  const gridDiv = document.querySelector('.grid');
  if (!gridDiv) return;
  const start = row * WORD_LENGTH;
  for (let c = 0; c < WORD_LENGTH; c++) {
    const tile = gridDiv.children[start + c];
    setTimeout(() => {
      tile.classList.add('flipping');
      // At 50% of animation (0.3s), swap color
      setTimeout(() => {
        const result = getTileResult(row, c);
        tile.classList.add(result);
      }, 300);
      // Remove animation class after full duration
      setTimeout(() => {
        tile.classList.remove('flipping');
      }, 600);
    }, c * 350);
  }
}

function submitGuess() {
  if (currentCol < WORD_LENGTH) {
    showMessage('Not enough letters');
    setTimeout(() => {
      const toast = document.getElementById('toast');
      if (toast) toast.classList.remove('show');
    }, 2000);
    return;
  }
  const guess = grid[currentRow].join('').toLowerCase();
  if (!guessList.includes(guess) && !answerList.includes(guess)) {
    showMessage('Not in word list');
    setTimeout(() => {
      const toast = document.getElementById('toast');
      if (toast) toast.classList.remove('show');
    }, 2000);
    return;
  }
  // Animate color reveal
  renderGrid();
  revealRow(currentRow);
  // Prevent extra feedback on last tile after flip
  lastFilled = { row: null, col: null };
  setTimeout(() => {
    currentRow++;
    currentCol = 0;
    renderGrid();
    renderKeyboard();
    if (guess === answer) {
      isGameOver = true;
      showMessage('🎉 You Win! 🎉');
      return;
    }
    if (currentRow === MAX_GUESSES) {
      isGameOver = true;
      showMessage(`Game Over! The word was: ${answer.toUpperCase()}`);
      return;
    }
  }, WORD_LENGTH * 350 + 350);
}


function showMessage(msg, duration = 2000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  if (duration > 0) {
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }
}

document.addEventListener('keydown', (e) => {
  if (e.metaKey) return; // Allow Cmd+R, Cmd+Shift+R, etc. to work as browser shortcuts
  if (isGameOver) return;
  if (e.key === 'Enter' || e.key === 'Backspace' || /^[a-zA-Z]$/.test(e.key)) {
    e.preventDefault();
    handleKey(e.key);
  }
});

window.onload = () => {
  console.debug('window.onload');
  // Hide toast on load
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = '';
    toast.classList.remove('show');
  }
  loadWordLists();
};
