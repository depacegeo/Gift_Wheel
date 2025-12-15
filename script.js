// === CONFIGURATION ===
const DEFAULT_EMPLOYEES = ["Dipesh", "Safala", "Pramada", "Bikram", "Seren", "Neerjara", "Laxmi", "Suraj", "Dinesh", "Rojin", "Prabin", "Muna", "Jenisha", "Luzala", "Princika", "Aruna", "Monika", "Ronika", "Gagan", "Rahish","Saleel"];
const ADMIN_USER = 'geovest';
const ADMIN_PASS = 'geovestdec25';

// GitHub configuration
let githubConfig = {
  token: null,
  username: null,
  repo: null
};

// Load GitHub config from localStorage
function loadGithubConfig() {
  const saved = localStorage.getItem('githubConfig');
  if (saved) {
    githubConfig = JSON.parse(saved);
  }
}

// Save GitHub config to localStorage
function saveGithubConfig(config) {
  githubConfig = config;
  localStorage.setItem('githubConfig', JSON.stringify(config));
}

// GitHub API functions
async function githubApiCall(method, path, data = null) {
  if (!githubConfig.token || !githubConfig.username || !githubConfig.repo) {
    throw new Error('GitHub not configured');
  }

  const url = `https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/contents/${path}`;
  const headers = {
    'Authorization': `token ${githubConfig.token}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  try {
    if (method === 'GET') {
      const response = await fetch(url, { headers });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
      const file = await response.json();
      return JSON.parse(atob(file.content));
    } else if (method === 'PUT') {
      // Get current file to get SHA (required for update)
      const getResponse = await fetch(url, { headers });
      let sha = null;
      if (getResponse.ok) {
        const file = await getResponse.json();
        sha = file.sha;
      }

      const body = {
        message: `Update ${path}`,
        content: btoa(JSON.stringify(data, null, 2)),
        branch: 'main'
      };
      if (sha) body.sha = sha;

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
      return true;
    }
  } catch (err) {
    console.error('GitHub API error:', err);
    throw err;
  }
}

// Load employees from GitHub or localStorage
async function loadEmployees() {
  loadGithubConfig();
  
  // Try GitHub first
  if (githubConfig.token) {
    try {
      const data = await githubApiCall('GET', 'employees.json');
      if (data) {
        return data;
      }
    } catch (err) {
      console.log('GitHub not available, falling back to localStorage');
    }
  }
  
  // Fallback to localStorage
  const saved = localStorage.getItem('employeesList');
  if (saved) {
    return JSON.parse(saved);
  }
  return DEFAULT_EMPLOYEES;
}

// Save employees to GitHub and localStorage
async function saveEmployees(list) {
  localStorage.setItem('employeesList', JSON.stringify(list));
  
  if (githubConfig.token) {
    try {
      await githubApiCall('PUT', 'employees.json', list);
    } catch (err) {
      console.log('Failed to sync to GitHub:', err.message);
    }
  }
}

// Load picks from GitHub or localStorage
async function loadPicksFromStorage() {
  loadGithubConfig();
  
  // Try GitHub first
  if (githubConfig.token) {
    try {
      const data = await githubApiCall('GET', 'picks.json');
      if (data) {
        return data;
      }
    } catch (err) {
      console.log('GitHub not available for picks');
    }
  }
  
  // Fallback to localStorage
  const saved = localStorage.getItem('pickLogs');
  if (saved) {
    return JSON.parse(saved);
  }
  return [];
}

// Save picks to GitHub and localStorage
async function savePicksToStorage(picks) {
  localStorage.setItem('pickLogs', JSON.stringify(picks));
  
  if (githubConfig.token) {
    try {
      await githubApiCall('PUT', 'picks.json', picks);
    } catch (err) {
      console.log('Failed to sync picks to GitHub:', err.message);
    }
  }
}

let employeesList = [];

// Shuffle function
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Initialize by loading employees
loadGithubConfig();

// Check for QR parameters and initialize appropriately
const params = new URLSearchParams(window.location.search);
const qrToken = params.get('code');
const qrEmployee = params.get('employee');

// Load employees and then initialize
loadEmployees().then(list => {
  employeesList = list;
  
  if (qrToken && qrEmployee) {
    // QR mode: show wheel
    initWheelApp();
  } else {
    // Admin mode: show login
    initAdminApp();
  }
});

// ===== ADMIN MODE =====
function initAdminApp() {
  document.getElementById('loginBox').classList.remove('hidden');
  document.getElementById('adminPanel').classList.add('hidden');
  document.getElementById('wheelPanel').classList.add('hidden');

  const loginBtn = document.getElementById('loginBtn');
  const loginMsg = document.getElementById('loginMsg');
  const loginBox = document.getElementById('loginBox');
  const adminPanel = document.getElementById('adminPanel');

  loginBtn.addEventListener('click', () => {
    const u = document.getElementById('adminUser').value.trim();
    const p = document.getElementById('adminPass').value.trim();
    if (u === ADMIN_USER && p === ADMIN_PASS) {
      loginBox.classList.add('hidden');
      adminPanel.classList.remove('hidden');
      initAdminPanel();
    } else {
      loginMsg.textContent = 'Invalid credentials';
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    loginBox.classList.remove('hidden');
    adminPanel.classList.add('hidden');
    document.getElementById('adminUser').value = '';
    document.getElementById('adminPass').value = '';
    document.getElementById('loginMsg').textContent = '';
    document.getElementById('qrGrid').innerHTML = '';
  });
}

function initAdminPanel() {
  const baseUrlInput = document.getElementById('baseUrl');
  const newEmployeeInput = document.getElementById('newEmployeeInput');
  const addEmployeeBtn = document.getElementById('addEmployeeBtn');

  // Load GitHub config into form
  loadGithubConfig();
  if (githubConfig.token) {
    document.getElementById('githubToken').value = githubConfig.token;
    document.getElementById('githubUsername').value = githubConfig.username || '';
    document.getElementById('githubRepo').value = githubConfig.repo || '';
    document.getElementById('githubStatus').textContent = '✓ GitHub configured';
    document.getElementById('githubStatus').style.color = 'green';
  }

  // Load and display current employees
  renderEmployeesList();

  // GitHub config handlers
  document.getElementById('saveGithubConfig').addEventListener('click', async () => {
    const token = document.getElementById('githubToken').value.trim();
    const username = document.getElementById('githubUsername').value.trim();
    const repo = document.getElementById('githubRepo').value.trim();

    if (!token || !username || !repo) {
      alert('Please fill all GitHub fields');
      return;
    }

    saveGithubConfig({ token, username, repo });
    document.getElementById('githubStatus').textContent = 'Saved! Click "Test Connection" to verify.';
    document.getElementById('githubStatus').style.color = 'blue';
  });

  document.getElementById('testGithubConnection').addEventListener('click', async () => {
    const statusEl = document.getElementById('githubStatus');
    statusEl.textContent = 'Testing...';
    statusEl.style.color = 'blue';

    try {
      loadGithubConfig();
      await githubApiCall('GET', 'employees.json');
      statusEl.textContent = '✓ Connection successful!';
      statusEl.style.color = 'green';
    } catch (err) {
      statusEl.textContent = '✗ Connection failed: ' + err.message;
      statusEl.style.color = 'red';
    }
  });

  document.getElementById('syncToGithub').addEventListener('click', async () => {
    const statusEl = document.getElementById('githubStatus');
    statusEl.textContent = 'Syncing...';
    statusEl.style.color = 'blue';

    try {
      loadGithubConfig();
      await saveEmployees(employeesList);
      await savePicksToStorage(pickLogs);
      statusEl.textContent = '✓ Synced to GitHub!';
      statusEl.style.color = 'green';
    } catch (err) {
      statusEl.textContent = '✗ Sync failed: ' + err.message;
      statusEl.style.color = 'red';
    }
  });

  // Add employee
  addEmployeeBtn.addEventListener('click', () => {
    const name = newEmployeeInput.value.trim();
    if (!name) {
      alert('Please enter an employee name');
      return;
    }
    if (employeesList.includes(name)) {
      alert('Employee already exists');
      return;
    }
    employeesList.push(name);
    saveEmployees(employeesList);
    newEmployeeInput.value = '';
    renderEmployeesList();
  });

  // Allow Enter key to add employee
  newEmployeeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addEmployeeBtn.click();
    }
  });

  // Base URL handling
  document.getElementById('loadDefaultUrl').addEventListener('click', () => {
    const loc = window.location;
    const guess = loc.origin + loc.pathname;
    baseUrlInput.value = guess;
  });

  // Token generation
  document.getElementById('generateTokens').addEventListener('click', () => {
    const base = baseUrlInput.value.trim();
    if (!base) { alert('Enter base URL to generate.'); return; }
    if (employeesList.length === 0) { alert('Add employees first.'); return; }
    const tokens = generateTokens();
    localStorage.setItem('qrTokens', JSON.stringify(tokens));
    renderGrid(base, tokens);
  });

  document.getElementById('reuseTokens').addEventListener('click', () => {
    const base = baseUrlInput.value.trim();
    if (!base) { alert('Enter base URL to render.'); return; }
    const saved = localStorage.getItem('qrTokens');
    if (!saved) { alert('No tokens generated yet. Click "Generate Tokens" first.'); return; }
    const tokens = JSON.parse(saved);
    renderGrid(base, tokens);
  });

  document.getElementById('printSheet').addEventListener('click', () => window.print());
  document.getElementById('downloadCSV').addEventListener('click', downloadCSV);
}

function renderEmployeesList() {
  const listContainer = document.getElementById('employeesList');
  listContainer.innerHTML = '';
  
  if (employeesList.length === 0) {
    listContainer.innerHTML = '<p style="text-align:center; color:#999;">No employees added yet</p>';
    return;
  }

  employeesList.forEach((employee, index) => {
    const item = document.createElement('div');
    item.className = 'employee-item';
    item.innerHTML = `
      <span>${employee}</span>
      <button type="button" onclick="removeEmployee(${index})">Delete</button>
    `;
    listContainer.appendChild(item);
  });
}

function removeEmployee(index) {
  if (confirm(`Remove ${employeesList[index]}?`)) {
    employeesList.splice(index, 1);
    saveEmployees(employeesList);
    renderEmployeesList();
  }
}

function generateTokens() {
  const tokens = {};
  employeesList.forEach(name => {
    tokens[name] = Math.random().toString(36).slice(2, 10);
  });
  return tokens;
}

function renderGrid(baseUrl, tokens) {
  const grid = document.getElementById('qrGrid');
  grid.innerHTML = '';
  employeesList.forEach(name => {
    const token = tokens[name];
    const url = `${baseUrl}?code=${encodeURIComponent(token)}&employee=${encodeURIComponent(name)}`;
    const card = document.createElement('div');
    card.className = 'card print-area';
    const title = document.createElement('h3');
    title.textContent = name;
    const urlEl = document.createElement('div');
    urlEl.className = 'url';
    urlEl.textContent = url;
    const qrEl = document.createElement('div');
    qrEl.style.margin = '8px auto';
    card.appendChild(title);
    card.appendChild(qrEl);
    card.appendChild(urlEl);
    grid.appendChild(card);
    new QRCode(qrEl, { text: url, width: 180, height: 180 });
  });
}

function downloadCSV() {
  const saved = localStorage.getItem('qrTokens');
  if (!saved) { alert('No tokens generated yet.'); return; }
  const tokens = JSON.parse(saved);
  const rows = ['Employee,Token'];
  Object.keys(tokens).forEach(name => rows.push(`${name},${tokens[name]}`));
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'qr_tokens.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== WHEEL MODE =====
// Local UI/state
let employees = []; // Will be shuffled copy of employeesList
let assignments = {}; // mapping giver -> receiver (closed loop mapping)
let assignedReceivers = {}; // mapping receiver -> giver (for display/sync)
let currentEmployee = null;
let wheel = null;

// Firebase / device state
let deviceId = null; // QR token or local device id
let nameScrollInterval = null;
let pickLogs = []; // array of { timeISO, giver, receiver }

function initWheelApp() {
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('adminPanel').classList.add('hidden');
  document.getElementById('wheelPanel').classList.remove('hidden');

  // Get fresh employee list and shuffle
  employees = shuffleArray(employeesList);

  // Load logs from storage (GitHub or localStorage)
  loadPicksFromStorage().then(logs => {
    pickLogs = logs;
    updateLogStatus();
  });

  // Validate QR params
  if (!qrEmployee || !employeesList.includes(qrEmployee)) {
    document.getElementById('qrError').textContent = 'Invalid or missing QR code. Please scan a valid QR code.';
    document.getElementById('startSpin').disabled = true;
    return;
  }

  currentEmployee = qrEmployee;
  deviceId = `qr-${qrToken}`;

  // Display employee name
  document.getElementById('employeeName').textContent = currentEmployee;

  // Build local closed-loop mapping and store to localStorage (if not exists)
  const saved = localStorage.getItem('closedLoopAssignments');
  if (saved) {
    assignments = JSON.parse(saved);
  } else {
    assignments = generateClosedLoop(employees);
    localStorage.setItem('closedLoopAssignments', JSON.stringify(assignments));
  }

  // Prepare inverse map to grey out receivers
  assignedReceivers = Object.fromEntries(Object.entries(assignments).map(([giver, receiver]) => [receiver, giver]));

  // One-time check for token
  if (localStorage.getItem(`spunToken:${qrToken}`) === 'true') {
    document.getElementById('startSpin').disabled = true;
    document.getElementById('resultText').innerText = 'This QR has already been used to spin.';
  } else {
    document.getElementById('startSpin').disabled = false;
    buildWheel();
  }
}

// Build the wheel with all employees except current employee
function buildWheel() {
  if (typeof Winwheel === 'undefined') {
    console.error('Winwheel library not loaded');
    alert('Error: Wheel library not loaded. Please refresh the page.');
    return;
  }

  const validNames = employees.filter(name => name !== currentEmployee);

  const segments = validNames.map((name, index) => ({
    // grey out segments already assigned (server-driven). If Firebase isn't configured,
    // `assignedReceivers` will be empty and segments will use gradient colors.
    fillStyle: assignedReceivers[name] ? '#CCCCCC' : getSegmentColor(index, validNames.length),
    text: name
  }));

  wheel = new Winwheel({
    canvasId: "wheelCanvas",
    numSegments: segments.length,
    segments: segments,
    animation: {
      type: "spinToStop",
      duration: 5,
      spins: 8,
      callbackFinished: announceResult,
      callbackAfter: drawPointer  // Redraw arrow after each frame
    }
  });
  
  // Draw arrow pointer (permanent)
  drawPointer();
  
  // Attach spin button listener
  attachSpinListener();
}

function getSegmentColor(index, total) {
  // Orange-Blue-White gradient colors
  const colors = [
    '#FF8C00',  // Dark Orange
    '#FFA500',  // Orange
    '#FFB347',  // Light Orange
    '#87CEEB',  // Sky Blue
    '#4682B4',  // Steel Blue
    '#1E90FF',  // Dodger Blue
    '#FFFFFF',  // White
    '#F0F8FF'   // Alice Blue (light)
  ];
  return colors[index % colors.length];
}

function drawPointer() {
  const canvas = document.getElementById('wheelCanvas');
  const ctx = canvas.getContext('2d');
  
  // Draw arrow pointer outside wheel at top, pointing down toward wheel
  ctx.save();
  ctx.fillStyle = '#FF0000';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  
  ctx.beginPath();
  ctx.moveTo(250, 15);   // Top point (outside wheel)
  ctx.lineTo(235, 50);   // Left point
  ctx.lineTo(265, 50);   // Right point
  ctx.closePath();
  
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Spin logic - attach after wheel is built
function attachSpinListener() {
  const spinBtn = document.getElementById("startSpin");
  spinBtn.addEventListener("click", () => {
    if (!currentEmployee) return;
    
    if (!wheel) {
      alert('Please select an employee first!');
      return;
    }

    // Determine the precomputed receiver for the current employee (closed loop)
    const targetName = assignments[currentEmployee];
    if (!targetName) {
      alert('No assignment found for this employee.');
      return;
    }

    wheel.stopAnimation(false);
    wheel.rotationAngle = 0;
    
    // Start scrolling through names
    const nameDisplay = document.getElementById('nameDisplay');
    const validNames = employees.filter(name => name !== currentEmployee);
    let nameIndex = 0;
    
    nameDisplay.style.display = 'block';
    nameScrollInterval = setInterval(() => {
      nameDisplay.textContent = validNames[nameIndex];
      nameIndex = (nameIndex + 1) % validNames.length;
    }, 100);
    
    // Force the wheel to land on the target segment for fairness
    const segIndex = wheel.segments.findIndex(s => s && s.text === targetName);
    if (segIndex > 0) {
      const stopAngle = wheel.getRandomForSegment(segIndex);
      wheel.animation.stopAngle = stopAngle;
    }

    wheel.startAnimation();
  });
}

// Announce and update
function announceResult(segment) {
  // In case the animation callback differs, ensure we use the predetermined receiver
  const selectedName = assignments[currentEmployee] || segment.text;
  
  // Stop name scrolling
  if (nameScrollInterval) {
    clearInterval(nameScrollInterval);
    nameScrollInterval = null;
  }
  
  const nameDisplay = document.getElementById('nameDisplay');
  nameDisplay.textContent = selectedName;
  
  setTimeout(() => {
    nameDisplay.style.display = 'none';
  }, 3000);
  
  // Persist/confirm assignment (no duplicates, closed loop)
  attemptAssignment(selectedName);
}

// Attempt to persist assignment using Firestore transaction. Falls back to local-only if Firestore unavailable.
async function attemptAssignment(selectedName) {
  const resultEl = document.getElementById('resultText');

  // Local-only: mapping already set; mark token/employee as spun and persist
  const localCycle = JSON.stringify(assignments);
  localStorage.setItem('closedLoopAssignments', localCycle);
  const params = new URLSearchParams(window.location.search);
  const qrToken = params.get('code');
  if (qrToken) {
    localStorage.setItem(`spunToken:${qrToken}`, 'true');
  } else {
    localStorage.setItem(`spun:${currentEmployee}`, 'true');
  }
  resultEl.innerText = `🎁 ${currentEmployee} will gift to ${selectedName}!`;
  resultEl.style.color = 'green';
  document.getElementById('startSpin').disabled = true;
  addLogEntry(currentEmployee, selectedName);
  return;
}

// Create a single closed loop (cycle) over all employees
function generateClosedLoop(list) {
  const order = shuffleArray(list);
  const map = {};
  for (let i = 0; i < order.length; i++) {
    const giver = order[i];
    const receiver = order[(i + 1) % order.length];
    map[giver] = receiver;
  }
  return map;
}

// --- Logging & export ---
async function addLogEntry(giver, receiver) {
  const entry = { timeISO: new Date().toISOString(), giver, receiver };
  // prevent duplicates for same giver
  const exists = pickLogs.some(e => e.giver === giver);
  if (!exists) {
    pickLogs.push(entry);
    // Save to both localStorage and GitHub
    await savePicksToStorage(pickLogs);
  }
  updateLogStatus();
}

function updateLogStatus() {
  const el = document.getElementById('logStatus');
  if (!el) return;
  el.textContent = `Log entries: ${pickLogs.length}`;
}

// Download log as a text file
const downloadBtn = document.getElementById('downloadLog');
if (downloadBtn) {
  downloadBtn.addEventListener('click', () => {
    const content = pickLogs
      .map(e => `${e.timeISO} | ${e.giver} -> ${e.receiver}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'picks.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}


