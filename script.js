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
// Words in top grid (random order, all filled)
let topGridWords = ['', '', '', '', ''];
let colorReveal = false;
// Track selected rows for swapping
let selectedRow = null; // index of first selected row, or null
let animatingSwap = false;
let rowCount = 5;
let columnCount = 5;

// Add at the top, after other state variables
let validateChances = 3;
let validateUsed = 0;
let validateGameOver = false;

function renderBottomGrid() {
  // Bottom grid: show letters, no coloring
  renderWordGrid('.bottom-grid', staticGridWords, true, false, '');
  const bottomGridDiv = document.querySelector('.bottom-grid');
  if (!bottomGridDiv) return;
  // Make each row draggable (attach listeners to row divs)
  Array.from(bottomGridDiv.children).forEach((rowDiv, rowIdx) => {
    rowDiv.setAttribute('draggable', staticGridWords[rowIdx] ? 'true' : 'false');
    rowDiv.setAttribute('data-source', 'bottom');
    rowDiv.setAttribute('data-index', rowIdx);
    
    // Hide empty rows (words that were moved to top grid)
    if (!staticGridWords[rowIdx]) {
      rowDiv.style.visibility = 'hidden';
    } else {
      rowDiv.style.visibility = 'visible';
    }
    
    // Add fade-in animation class if word just appeared (from snap-back)
    if (staticGridWords[rowIdx] && currentDrag.word === staticGridWords[rowIdx] && currentDrag.snapBack) {
      rowDiv.classList.add('fade-in');
      // Remove animation class after it completes
      setTimeout(() => {
        rowDiv.classList.remove('fade-in');
      }, 300);
    }
    
    rowDiv.ondragstart = function(e) {
      if (!staticGridWords[rowIdx]) {
        e.preventDefault();
        return;
      }
      // Track drag state
      currentDrag = {
        active: true,
        source: 'bottom',
        index: rowIdx,
        word: staticGridWords[rowIdx],
        snapBack: false
      };
      
      // Create a ghost node for drag visual
      const ghost = rowDiv.cloneNode(true);
      ghost.style.position = 'absolute';
      ghost.style.top = '-9999px';
      ghost.style.left = '-9999px';
      ghost.style.opacity = '0.7';
      ghost.style.pointerEvents = 'none';
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
      setTimeout(() => document.body.removeChild(ghost), 0);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('source', 'bottom');
      e.dataTransfer.setData('index', rowIdx);
      
      // Hide the original row to give feel that it's being dragged
      setTimeout(() => {
        rowDiv.style.visibility = 'hidden';
      }, 0);
    };
    
    rowDiv.ondragend = function(e) {
      // Only show the row again if the word is still in bottom grid (drop failed/cancelled)
      if (staticGridWords[rowIdx]) {
        rowDiv.style.visibility = 'visible';
      }
      // If word was successfully moved to top, keep it hidden
      
      // If dropped outside valid target (dropEffect is 'none'), do nothing
      // The word is still in bottom grid
      currentDrag.active = false;
      currentDrag.snapBack = false;
    };
    
    // TEMPORARILY DISABLED: Click to auto-place in top grid
    // Uncomment to re-enable this feature
    /*
    rowDiv.onclick = function() {
      if (staticGridWords[rowIdx]) {
        const emptyIdx = topGridWords.findIndex(w => !w);
        if (emptyIdx !== -1) {
          // Record move for undo
          moveHistory.push({
            from: { grid: 'bottom', index: rowIdx },
            to: { grid: 'top', index: emptyIdx },
            word: staticGridWords[rowIdx]
          });
          
          topGridWords[emptyIdx] = staticGridWords[rowIdx];
          staticGridWords[rowIdx] = '';
          renderTopGrid();
          renderBottomGrid();
          updateColorButton();
          updateUndoButton();
        }
      }
    };
    */
  });

  // Make top grid rows droppable
  const topGridDiv = document.querySelector('.top-grid');
  if (topGridDiv) {
    Array.from(topGridDiv.children).forEach((rowDiv, rowIdx) => {
      rowDiv.ondragover = function(e) {
        if (!topGridWords[rowIdx]) {
          e.preventDefault();
          // Add highlight class when dragging over empty row
          rowDiv.classList.add('drag-hover');
        }
      };
      
      rowDiv.ondragleave = function(e) {
        // Remove highlight when leaving the row
        rowDiv.classList.remove('drag-hover');
      };
      
      rowDiv.ondrop = function(e) {
        e.preventDefault();
        // Remove highlight on drop
        rowDiv.classList.remove('drag-hover');
        
        const source = e.dataTransfer.getData('source');
        const fromIdx = parseInt(e.dataTransfer.getData('index'), 10);
        
        if (source === 'bottom' && !staticGridWords[fromIdx]) return;
        if (source === 'top' && !topGridWords[fromIdx]) return;
        
        if (!topGridWords[rowIdx]) {
          // Mark drag as completed successfully
          currentDrag.active = false;
          
          if (source === 'bottom') {
            // Record move for undo
            moveHistory.push({
              from: { grid: 'bottom', index: fromIdx },
              to: { grid: 'top', index: rowIdx },
              word: staticGridWords[fromIdx]
            });
            
            topGridWords[rowIdx] = staticGridWords[fromIdx];
            staticGridWords[fromIdx] = '';
          } else if (source === 'top') {
            // Record move for undo
            moveHistory.push({
              from: { grid: 'top', index: fromIdx },
              to: { grid: 'top', index: rowIdx },
              word: topGridWords[fromIdx]
            });
            
            topGridWords[rowIdx] = topGridWords[fromIdx];
            topGridWords[fromIdx] = '';
          }
          renderTopGrid();
          renderBottomGrid();
          updateColorButton();
          updateUndoButton();
        }
      };
    });
  }
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
  // Shuffle for top grid (different order from sample grid)
  topGridWords = [...selected].sort(() => Math.random() - 0.5);
  answer = selected[4]; // 5th word is the answer
  selectedRow = null;
  animatingSwap = false;
  validateChances = 3;
  validateUsed = 0;
  validateGameOver = false;
  renderTargetGrid();
  renderTopGrid();
  renderKeyboard();
}

function renderTargetGrid() {
  // Show the 5 assigned words colored against the answer word, but do not display letters
  const gridDiv = document.querySelector('.target-grid');
  if (!gridDiv) return;
  gridDiv.innerHTML = '';
  for (let r = 0; r < rowCount; r++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'grid-row';
    for (let c = 0; c < columnCount; c++) {
      const tile = document.createElement('div');
      let classes = ['tile'];
      if (assignedWords[r]) {
        const wordleColors = getWordleRowResult(assignedWords[r], assignedWords[4]);
        classes.push(wordleColors[c]);
        console.log('row', r, 'column', c, 'colors', wordleColors);
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
  const gridDiv = document.querySelector('.top-grid');
  if (!gridDiv) return;
  gridDiv.innerHTML = '';
  const userAnswer = topGridWords[4] && colorReveal ? topGridWords[4] : null;
  // Track second selected row for visual feedback
  let secondSelectedRow = renderTopGrid._secondSelectedRow;
  for (let r = 0; r < 5; r++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'grid-row';
    rowDiv.setAttribute('data-index', r);
    rowDiv.style.cursor = 'pointer';
    for (let c = 0; c < 5; c++) {
      const tile = document.createElement('div');
      let classes = ['tile'];
      let letter = '';
      if (topGridWords[r]) {
        letter = topGridWords[r][c] ? topGridWords[r][c].toUpperCase() : '';
      }
      if (topGridWords[r] && colorReveal && userAnswer) {
        const wordleColors = getWordleRowResult(topGridWords[r], userAnswer);
        classes.push(wordleColors[c]);
      }
      if (selectedRow === r || secondSelectedRow === r) {
        classes.push('selected');
      }
      tile.textContent = letter;
      tile.className = classes.join(' ');
      rowDiv.appendChild(tile);
    }
    rowDiv.onclick = function() {
      if (animatingSwap) return;
      if (selectedRow === null) {
        selectedRow = r;
        renderTopGrid._secondSelectedRow = undefined;
        renderTopGrid();
      } else if (selectedRow === r) {
        selectedRow = null;
        renderTopGrid._secondSelectedRow = undefined;
        renderTopGrid();
      } else {
        // Mark both rows as selected for visual feedback
        renderTopGrid._secondSelectedRow = r;
        renderTopGrid();
        // Swap rows with animation after a short delay
        setTimeout(() => {
          animateSwap(selectedRow, r);
          renderTopGrid._secondSelectedRow = undefined;
        }, 150);
      }
    };
    gridDiv.appendChild(rowDiv);
  }
}
// Animate swapping two rows in the top grid
function animateSwap(rowA, rowB) {
  animatingSwap = true;
  const gridDiv = document.querySelector('.top-grid');
  const rowDivs = Array.from(gridDiv.children);
  const rectA = rowDivs[rowA].getBoundingClientRect();
  const rectB = rowDivs[rowB].getBoundingClientRect();
  // Create ghost nodes
  const ghostA = rowDivs[rowA].cloneNode(true);
  const ghostB = rowDivs[rowB].cloneNode(true);
  ghostA.style.position = ghostB.style.position = 'fixed';
  ghostA.style.left = rectA.left + 'px';
  ghostA.style.top = rectA.top + 'px';
  ghostB.style.left = rectB.left + 'px';
  ghostB.style.top = rectB.top + 'px';
  ghostA.style.width = rectA.width + 'px';
  ghostB.style.width = rectB.width + 'px';
  ghostA.style.pointerEvents = ghostB.style.pointerEvents = 'none';
  ghostA.style.zIndex = ghostB.style.zIndex = 1000;
  document.body.appendChild(ghostA);
  document.body.appendChild(ghostB);
  // Hide originals
  rowDivs[rowA].style.visibility = 'hidden';
  rowDivs[rowB].style.visibility = 'hidden';
  // Animate ghosts
  requestAnimationFrame(() => {
    ghostA.style.transition = ghostB.style.transition = 'top 0.35s, left 0.35s';
    ghostA.style.top = rectB.top + 'px';
    ghostB.style.top = rectA.top + 'px';
    setTimeout(() => {
      // Remove ghosts, show originals, swap data
      document.body.removeChild(ghostA);
      document.body.removeChild(ghostB);
      // Swap words
      const temp = topGridWords[rowA];
      topGridWords[rowA] = topGridWords[rowB];
      topGridWords[rowB] = temp;
      selectedRow = null;
      animatingSwap = false;
      renderTopGrid();
    }, 370);
  });
}

// Helper function to find original position of a word in bottom grid
// Helper function to find original position of a word in bottom grid
function findOriginalBottomIndex(word) {
  return originalBottomGridWords.findIndex(w => w === word);
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
  btn.disabled = false;
  btn.textContent = `Validate(${validateChances - validateUsed})`;
}

// Enable/disable Undo button based on move history
function updateUndoButton() {
  const btn = document.getElementById('undo-btn');
  if (!btn) return;
  btn.disabled = moveHistory.length === 0;
}

// Undo the last move
function undoLastMove() {
  if (moveHistory.length === 0) return;
  
  const lastMove = moveHistory.pop();
  
  // Reverse the move
  if (lastMove.from.grid === 'bottom' && lastMove.to.grid === 'top') {
    // Move word back from top to bottom
    staticGridWords[lastMove.from.index] = lastMove.word;
    topGridWords[lastMove.to.index] = '';
  } else if (lastMove.from.grid === 'top' && lastMove.to.grid === 'top') {
    // Move word back within top grid
    topGridWords[lastMove.from.index] = lastMove.word;
    topGridWords[lastMove.to.index] = '';
  }
  
  renderTopGrid();
  renderBottomGrid();
  updateColorButton();
  updateUndoButton();
  
  console.log('Undid move:', lastMove);
}

document.addEventListener('DOMContentLoaded', () => {
  const colorBtn = document.getElementById('color-btn');
  if (colorBtn) {
    colorBtn.onclick = () => {
      if (validateGameOver) return;
      colorReveal = true;
      renderTopGrid();
      validateUsed++;
      updateColorButton();
      if (checkGameStatus()) {
        colorBtn.disabled = true;
      } else if (validateUsed >= validateChances) {
        validateGameOver = true;
        colorBtn.disabled = true;
        showMessage('❌ Game Over! Out of chances.', 3000);
      }
    };
  }
  
  const undoBtn = document.getElementById('undo-btn');
  if (undoBtn) {
    undoBtn.onclick = () => {
      undoLastMove();
    };
  }
});

// Modify checkGameStatus to return true if win, false otherwise
function checkGameStatus() {
  if (!topGridWords.every(w => w && w.length === 5)) return false;
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
    validateGameOver = true;
    return true;
  } else {
    showMessage('❌ Colors do not match. Try again!', 2000);
    // Hide colors again so player can rearrange
    setTimeout(() => {
      colorReveal = false;
      renderTopGrid();
    }, 1200);
    return false;
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
