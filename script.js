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

// Game state
let answerList = [];
let guessList = [];
let selectedWords = ['', '', '', '', '']; // Current order in top grid (player can rearrange)
let targetWords = ['', '', '', '', '']; // Fixed target order in sample grid
let answerWord = '';

// Load word lists
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
    console.error('Error loading word lists:', e);
    showMessage('Error loading word lists.');
  }
}

function startGame() {
  // Select 5 unique random words
  const selected = [];
  const used = new Set();
  while (selected.length < 5) {
    const idx = Math.floor(Math.random() * answerList.length);
    if (!used.has(answerList[idx])) {
      selected.push(answerList[idx]);
      used.add(answerList[idx]);
    }
  }
  
  // Create target order (for sample grid) - this stays fixed
  targetWords = [...selected];
  answerWord = targetWords[4]; // Last word in target is the answer
  
  // Create a different random order for top grid (player's starting position)
  selectedWords = [...selected];
  // Shuffle until we get a different order
  do {
    selectedWords.sort(() => Math.random() - 0.5);
  } while (arraysEqual(selectedWords, targetWords));
  
  console.log('Target words (sample grid - fixed):', targetWords);
  console.log('Target answer word:', answerWord);
  console.log('Starting words (top grid - shuffled):', selectedWords);
  console.log('Starting answer word (top grid last):', selectedWords[4]);
  
  renderTargetGrid();
  renderTopGrid();
}

// Helper function to check if two arrays are equal
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function renderTargetGrid() {
  // Show the FIXED target color pattern (no letters)
  // This uses the targetWords array which never changes after game start
  const gridDiv = document.querySelector('.target-grid');
  if (!gridDiv) return;
  gridDiv.innerHTML = '';
  
  // Always use the original answer word (targetWords[4]) for the sample grid
  const targetAnswer = targetWords[4] || answerWord;
  
  for (let r = 0; r < 5; r++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'grid-row';
    for (let c = 0; c < 5; c++) {
      const tile = document.createElement('div');
      let classes = ['tile'];
      if (targetWords[r]) {
        const wordleColors = getWordleRowResult(targetWords[r], targetAnswer);
        classes.push(wordleColors[c]);
      }
      tile.textContent = '';
      tile.className = classes.join(' ');
      rowDiv.appendChild(tile);
    }
    gridDiv.appendChild(rowDiv);
  }
}

// Track drag state
let dragState = {
  draggedIndex: -1,
  currentHoverIndex: -1
};

function renderTopGrid() {
  // Show the words with Wordle-style coloring
  // The last row word is used as the answer for coloring all rows
  const gridDiv = document.querySelector('.top-grid');
  if (!gridDiv) return;
  gridDiv.innerHTML = '';
  
  // Use the CURRENT last word in selectedWords as the answer
  const currentAnswer = selectedWords[4];
  
  for (let r = 0; r < 5; r++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'grid-row';
    rowDiv.setAttribute('draggable', 'true');
    rowDiv.setAttribute('data-row-index', r);
    
    for (let c = 0; c < 5; c++) {
      const tile = document.createElement('div');
      let classes = ['tile'];
      let letter = '';
      if (selectedWords[r]) {
        letter = selectedWords[r][c] ? selectedWords[r][c].toUpperCase() : '';
        const wordleColors = getWordleRowResult(selectedWords[r], currentAnswer);
        classes.push(wordleColors[c]);
      }
      tile.textContent = letter;
      tile.className = classes.join(' ');
      rowDiv.appendChild(tile);
    }
    
    // Drag and drop handlers
    rowDiv.ondragstart = function(e) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', r.toString());
      dragState.draggedIndex = r;
      setTimeout(() => {
        rowDiv.classList.add('dragging');
      }, 0);
    };
    
    rowDiv.ondragend = function(e) {
      rowDiv.classList.remove('dragging');
      dragState.draggedIndex = -1;
      dragState.currentHoverIndex = -1;
      // Clean up any remaining visual states
      document.querySelectorAll('.grid-row').forEach(row => {
        row.classList.remove('drag-over');
      });
      
      // Check if player won after dropping
      checkWinCondition();
    };
    
    rowDiv.ondragover = function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const draggedIndex = dragState.draggedIndex;
      if (draggedIndex === -1 || draggedIndex === r) return;
      
      // Only reorder if we've moved to a different row
      if (dragState.currentHoverIndex !== r) {
        dragState.currentHoverIndex = r;
        reorderRows(draggedIndex, r);
      }
    };
    
    rowDiv.ondragenter = function(e) {
      e.preventDefault();
    };
    
    rowDiv.ondragleave = function(e) {
      // Don't do anything here - let ondragover handle the logic
    };
    
    rowDiv.ondrop = function(e) {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      
      console.log('Dropped at row', r);
      console.log('Current top grid order:', selectedWords);
      console.log('Current answer word (last row):', selectedWords[4]);
      
      // Re-render top grid to ensure colors are correct (sample grid never changes)
      renderTopGrid();
    };
    
    // Click handler for debugging
    rowDiv.onclick = function() {
      console.log('Top grid row clicked', r, selectedWords[r]);
    };
    
    gridDiv.appendChild(rowDiv);
  }
}

function reorderRows(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  
  // Create a new array with the reordered items
  const newOrder = [...selectedWords];
  const draggedItem = newOrder[fromIndex];
  
  // Remove the dragged item
  newOrder.splice(fromIndex, 1);
  
  // Insert at the new position
  newOrder.splice(toIndex, 0, draggedItem);
  
  // Update the selectedWords array
  selectedWords = newOrder;
  
  // Re-render ONLY the top grid (sample grid stays fixed)
  renderTopGrid();
  
  // Restore the dragging state on the correct element
  setTimeout(() => {
    const rows = document.querySelectorAll('.top-grid .grid-row');
    if (rows[toIndex]) {
      rows[toIndex].classList.add('dragging');
    }
  }, 0);
}

function checkWinCondition() {
  // Check if the color patterns match between sample grid and top grid
  if (!selectedWords[4] || !targetWords[4]) return;
  
  // Get color patterns for both grids
  const targetColors = [];
  const currentColors = [];
  
  for (let r = 0; r < 5; r++) {
    targetColors.push(getWordleRowResult(targetWords[r], targetWords[4]));
    currentColors.push(getWordleRowResult(selectedWords[r], selectedWords[4]));
  }
  
  // Compare the color patterns
  let match = true;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (targetColors[r][c] !== currentColors[r][c]) {
        match = false;
        break;
      }
    }
    if (!match) break;
  }
  
  if (match) {
    setTimeout(() => {
      showMessage('🎉 Perfect! Colors match! You won! 🎉', 5000);
    }, 300);
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

// Initialize game on load
window.onload = () => {
  loadWordLists();
};
