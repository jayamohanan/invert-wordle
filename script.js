// Get Wordle-style color for each letter in a guess vs answer
function getWordleRowResult(guess, answer) {
  const result = Array(guess.length).fill('absent');
  const answerArr = answer.split('');
  const guessArr = guess.split('');
  // First pass: green
  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] === answerArr[i]) {
      result[i] = 'correct';
      answerArr[i] = null; // Mark as used
      guessArr[i] = null;
    }
  }
  // Second pass: yellow
  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] && answerArr.includes(guessArr[i])) {
      result[i] = 'present';
      answerArr[answerArr.indexOf(guessArr[i])] = null;
    }
  }
  return result;
}
// Hidden words for each row in top grid
// Words assigned to each row in top grid for coloring reference
let assignedWords = ['', '', '', '', ''];
// Words filled by the player in top grid (initially empty)
let topGridWords = ['', '', '', '', ''];
let colorReveal = false;
// Words to display in bottom grid
let staticGridWords = ['', '', '', '', ''];

function renderBottomGrid() {
  // Bottom grid: show letters, no coloring
  renderWordGrid('.bottom-grid', staticGridWords, true, false, '');
  const bottomGridDiv = document.querySelector('.bottom-grid');
  if (!bottomGridDiv) return;
  // Make each row draggable (attach listeners to row divs)
  Array.from(bottomGridDiv.children).forEach((rowDiv, rowIdx) => {
    rowDiv.setAttribute('draggable', 'true');
    rowDiv.addEventListener('dragstart', function(e) {
      console.log('Drag started for row', rowIdx);
      // Create a visual copy for dragging
      const dragCopy = rowDiv.cloneNode(true);
      dragCopy.style.opacity = '1';
      dragCopy.style.background = '#eee';
      dragCopy.style.position = 'fixed';
      dragCopy.style.pointerEvents = 'none';
      dragCopy.style.zIndex = '1000';
      dragCopy.style.left = '-9999px';
      dragCopy.style.top = '-9999px';
      dragCopy.style.width = rowDiv.offsetWidth + 'px';
      dragCopy.style.height = rowDiv.offsetHeight + 'px';
      document.body.appendChild(dragCopy);
      e.dataTransfer.setDragImage(dragCopy, rowDiv.offsetWidth/2, rowDiv.offsetHeight/2);
      rowDiv.style.visibility = 'hidden';
      e.dataTransfer.setData('text/plain', rowIdx);
      rowDiv._dragCopy = dragCopy;
    });
    rowDiv.addEventListener('dragend', function(e) {
      rowDiv.style.visibility = '';
      if (rowDiv._dragCopy) {
        document.body.removeChild(rowDiv._dragCopy);
        rowDiv._dragCopy = null;
      }
    });
    rowDiv.onclick = function() {
      console.log('Bottom grid row clicked:', rowIdx, 'Word:', staticGridWords[rowIdx]);
      if (staticGridWords[rowIdx]) {
        console.log('topGridWords before:', topGridWords);
        const emptyIdx = topGridWords.findIndex(w => !w);
        console.log('Empty index in top grid:', emptyIdx);
        if (emptyIdx !== -1) {
          topGridWords[emptyIdx] = staticGridWords[rowIdx];
          staticGridWords[rowIdx] = '';
          renderTopGrid();
          renderBottomGrid();
          updateColorButton();
        }
      }
    };
  });
}

// Ensure game initializes on page load
window.onload = () => {
  loadWordLists();
  updateColorButton();
};
// Wordle Clone JS
const WORD_LENGTH = 5;
const MAX_GUESSES = 5;
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
    renderTopGrid();
    renderKeyboard();
  }
}

function startGame() {
  // Select 5 unique words for the level
  const selected = [];
  const used = new Set();
  while (selected.length < 5) {
    const idx = Math.floor(Math.random() * answerList.length);
    if (!used.has(answerList[idx])) {
      selected.push(answerList[idx]);
      used.add(answerList[idx]);
    }
  }
  assignedWords = [...selected];
  topGridWords = ['', '', '', '', ''];
  answer = selected[4]; // 5th word is the answer
  console.log('Answer word for coloring:', answer);
  currentRow = 0;
  currentCol = 0;
  isGameOver = false;
  grid = Array.from({ length: MAX_GUESSES }, () => Array(WORD_LENGTH).fill(''));
  lastFilled = { row: null, col: null };
  // Shuffle and assign to bottom grid
  staticGridWords = [...selected].sort(() => Math.random() - 0.5);
  renderTargetGrid();
  renderTopGrid();
  renderKeyboard();
  renderBottomGrid();
}

function renderTargetGrid() {
  // Show the 5 assigned words colored against the answer word, but do not display letters
  const gridDiv = document.querySelector('.target-grid');
  if (!gridDiv) return;
  gridDiv.innerHTML = '';
  for (let r = 0; r < 5; r++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'grid-row';
    for (let c = 0; c < 5; c++) {
      const tile = document.createElement('div');
      let classes = ['tile'];
      if (assignedWords[r]) {
        const wordleColors = getWordleRowResult(assignedWords[r], assignedWords[4]);
        classes.push(wordleColors[c]);
      }
      tile.textContent = '';
      tile.className = classes.join(' ');
      rowDiv.appendChild(tile);
    }
    gridDiv.appendChild(rowDiv);
  }
}

// Shared grid rendering function for 5x5 grids
function renderWordGrid(containerSelector, words, showLetters = true, colorRows = false, answerWord = '') {
  const gridDiv = document.querySelector(containerSelector);
  if (!gridDiv) return;
  gridDiv.innerHTML = '';
  for (let r = 0; r < 5; r++) {
    const rowDiv = document.createElement('div');
   rowDiv.className = 'grid-row';
    for (let c = 0; c < 5; c++) {
      const tile = document.createElement('div');
      let classes = ['tile'];
      let letter = '';
      if (words[r]) {
        if (showLetters) letter = words[r][c] ? words[r][c].toUpperCase() : '';
        if (colorRows && answerWord) {
          // Wordle-style coloring
          const wordleColors = getWordleRowResult(words[r], answerWord);
          classes.push(wordleColors[c]);
        }
      }
      tile.textContent = letter;
      tile.className = classes.join(' ');
      rowDiv.appendChild(tile);
    }
    gridDiv.appendChild(rowDiv);
  }
}

function renderTopGrid() {
  // Top grid: show colored tiles, only show letters for rows filled by user
  const gridDiv = document.querySelector('.top-grid');
  if (!gridDiv) return;
  gridDiv.innerHTML = '';
  // Determine the user's answer word (last row)
  const userAnswer = topGridWords[4] && colorReveal ? topGridWords[4] : null;
  for (let r = 0; r < 5; r++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'grid-row';
    for (let c = 0; c < 5; c++) {
      const tile = document.createElement('div');
      let classes = ['tile'];
      let letter = '';
      // Only show letters if the word was placed by user
      if (topGridWords[r]) {
        letter = topGridWords[r][c] ? topGridWords[r][c].toUpperCase() : '';
      }
      if (topGridWords[r] && colorReveal && userAnswer) {
        // Color using the last row as the answer
        const wordleColors = getWordleRowResult(topGridWords[r], userAnswer);
        classes.push(wordleColors[c]);
      }
      tile.textContent = letter;
      tile.className = classes.join(' ');
      rowDiv.appendChild(tile);
    }
    gridDiv.appendChild(rowDiv);
  }
}

// function renderBottomGrid() {
//   // Bottom grid: show letters, no coloring
//   renderWordGrid('.bottom-grid', staticGridWords, true, false, '');
//   // Add click handler to the entire grid
//   const bottomGridDiv = document.querySelector('.bottom-grid');
//   if (!bottomGridDiv) return;
//   bottomGridDiv.onclick = (e) => {
//     const tile = e.target;
//     if (!tile.classList.contains('tile')) return;
//     // Find the row div that was clicked
//     const rowDiv = tile.parentElement;
//     const rowIdx = Array.from(bottomGridDiv.children).indexOf(rowDiv);
//     console.log('rbg Bottom grid row clicked:', rowIdx);
//     if (rowIdx === -1) return;
//     if (staticGridWords[rowIdx]) {
//       const emptyIdx = topGridWords.findIndex(w => !w);
//       if (emptyIdx !== -1) {
//         topGridWords[emptyIdx] = staticGridWords[rowIdx];
//         staticGridWords[rowIdx] = '';
//         renderTopGrid();
//         renderBottomGrid();
//       }
//     }
//   };
// }

function renderGrid() {
  const gridDiv = document.querySelector('.top-grid');
  if (!gridDiv) return;
  gridDiv.innerHTML = '';
  for (let r = 0; r < MAX_GUESSES; r++) {
    let wordleColors = null;
    // If topGridWords assigned, color each row as a guess
    if (topGridWords[r] && answer) {
      wordleColors = getWordleRowResult(topGridWords[r], answer);
    }
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = document.createElement('div');
      // If topGridWords assigned, show only colored fill, no letter
      if (topGridWords[r]) {
        tile.textContent = '';
        let classes = ['tile', wordleColors ? wordleColors[c] : 'absent'];
        tile.className = classes.join(' ');
      } else {
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
      }
      gridDiv.appendChild(tile);
    }
  }
}

function renderKeyboard() {
  const keyboard = document.querySelector('.keyboard');
  if (!keyboard) return;
  keyboard.style.display = 'none'; // Hide the keyboard
  keyboard.innerHTML = '';
  // ...existing code...
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
  const gridDiv = document.querySelector('.top-grid');
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

// Enable/disable Color button based on topGridWords
function updateColorButton() {
  const btn = document.getElementById('color-btn');
  if (!btn) return;
  const allFilled = topGridWords.every(w => w && w.length === 5);
  btn.disabled = !allFilled;
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('color-btn');
  if (!btn) return;
  btn.onclick = () => {
    colorReveal = true;
    renderTopGrid();
    btn.disabled = true;
    checkGameStatus();
  };
});

function checkGameStatus() {
  // Compare color pattern of top grid to sample grid
  // Sample grid: assignedWords vs assignedWords[4]
  // Top grid: topGridWords vs topGridWords[4]
  if (!topGridWords.every(w => w && w.length === 5)) return;
  const sampleColors = [];
  const userColors = [];
  for (let r = 0; r < 5; r++) {
    sampleColors.push(getWordleRowResult(assignedWords[r], assignedWords[4]));
    userColors.push(getWordleRowResult(topGridWords[r], topGridWords[4]));
  }
  let match = true;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (sampleColors[r][c] !== userColors[r][c]) {
        match = false;
        break;
      }
    }
    if (!match) break;
  }
  if (match) {
    showMessage('🎉 Colors match! You win! 🎉', 3000);
  } else {
    showMessage('❌ Colors do not match. Try again!', 3000);
  }
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
