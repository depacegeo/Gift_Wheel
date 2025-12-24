// === APP VERSION & CACHE MANAGEMENT ===
const APP_VERSION = '1.0.1'; // Increment this to force cache refresh

// Check version and clear cache if outdated
const savedVersion = localStorage.getItem('appVersion');
if (savedVersion !== APP_VERSION) {
  console.log(`🔄 Version updated: ${savedVersion || 'none'} → ${APP_VERSION}`);
  console.log('🧹 Clearing old cache...');
  localStorage.clear();
  localStorage.setItem('appVersion', APP_VERSION);
  console.log('✓ Cache cleared for new version');
} else {
  console.log(`✓ App version ${APP_VERSION} - cache OK`);
}

// === CONFIGURATION ===
const ADMIN_USER = 'geovest';
const ADMIN_PASS = 'geovestdec25';

// GitHub configuration
let githubConfig = {
  token: '',
  username: 'depacegeo',
  repo: 'Gift_Wheel'
};

// EmailJS configuration
let emailConfig = {
  serviceId: 'service_d7t2xfh',
  templateId: 'template_10qda1m',
  publicKey: 'bbItQ3TIl4hiwVHQI',
  recipientEmail: 'depace.newa@gmail.com'
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

// Load EmailJS config from localStorage
function loadEmailConfig() {
  const saved = localStorage.getItem('emailConfig');
  if (saved) {
    emailConfig = JSON.parse(saved);
  }
}

// Save EmailJS config to localStorage
function saveEmailConfig(config) {
  emailConfig = config;
  localStorage.setItem('emailConfig', JSON.stringify(config));
}

// Send email notification using EmailJS
async function sendPickEmail(giver, receiver) {
  loadEmailConfig();
  
  if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) {
    console.warn('EmailJS not configured, skipping email notification');
    return false;
  }
  
  try {
    console.log('Sending email notification...');
    console.log('Giver:', giver, 'Receiver:', receiver);
    
    // Initialize EmailJS if not already done
    if (typeof emailjs !== 'undefined') {
      emailjs.init(emailConfig.publicKey);
      
      // Format timestamp
      const now = new Date();
      const timestamp = now.toLocaleString('en-US', { 
        timeZone: 'Asia/Kathmandu',
        dateStyle: 'full',
        timeStyle: 'long'
      });
      
      // Template parameters - use simple key names that match EmailJS template variables
      const templateParams = {
        // Common variable names
        to_name: 'Admin',
        to_email: emailConfig.recipientEmail,
        from_name: 'Gift Wheel App',
        
        // Pick-specific variables
        giver: giver,
        receiver: receiver,
        giver_name: giver,
        receiver_name: receiver,
        
        // Timestamp in multiple formats
        timestamp: timestamp,
        date: now.toLocaleDateString('en-US', { timeZone: 'Asia/Kathmandu' }),
        time: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu' }),
        
        // Message
        message: `${giver} has picked ${receiver} for the gift exchange!`
      };
      
      console.log('Template params:', templateParams);
      
      await emailjs.send(
        emailConfig.serviceId,
        emailConfig.templateId,
        templateParams
      );
      
      console.log('✓ Email sent successfully to', emailConfig.recipientEmail);
      return true;
    } else {
      console.error('EmailJS library not loaded');
      return false;
    }
  } catch (err) {
    console.error('Failed to send email:', err);
    console.error('Error details:', err.text || err.message);
    return false;
  }
}

// GitHub API functions with retry logic (fast fail for better UX)
async function githubApiCall(method, path, data = null, retries = 2) {
  if (!githubConfig.token || !githubConfig.username || !githubConfig.repo) {
    const error = 'GitHub not configured: ' + JSON.stringify({
      hasToken: !!githubConfig.token,
      username: githubConfig.username,
      repo: githubConfig.repo
    });
    console.error(error);
    throw new Error(error);
  }

  const url = `https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/contents/${path}`;
  const headers = {
    'Authorization': `token ${githubConfig.token}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (method === 'GET') {
        const response = await fetch(url, { headers });
        if (response.status === 404) return null;
        if (!response.ok) {
          const errorText = await response.text();
          let errorDetails;
          try {
            errorDetails = JSON.parse(errorText);
          } catch {
            errorDetails = { message: errorText };
          }
          
          // Provide helpful error messages
          let helpfulMessage = `GitHub API error ${response.status}`;
          if (response.status === 403) {
            helpfulMessage += ' - Token may be invalid or lack "repo" permissions';
          } else if (response.status === 401) {
            helpfulMessage += ' - Authentication failed';
          }
          helpfulMessage += ': ' + (errorDetails.message || errorText);
          
          throw new Error(helpfulMessage);
        }
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
          message: `Update ${path} at ${new Date().toISOString()}`,
          content: btoa(JSON.stringify(data, null, 2)),
          branch: 'main'
        };
        if (sha) body.sha = sha;

        const response = await fetch(url, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorDetails;
          try {
            errorDetails = JSON.parse(errorText);
          } catch {
            errorDetails = { message: errorText };
          }
          
          // Provide helpful error messages for common issues
          let helpfulMessage = `GitHub API error ${response.status}`;
          if (response.status === 403) {
            helpfulMessage += '\n\nPossible causes:\n' +
              '1. Invalid or expired GitHub token\n' +
              '2. Token lacks required permissions (needs "repo" scope)\n' +
              '3. Rate limit exceeded\n' +
              '4. Repository access denied\n\n' +
              'Solution: Generate a new Personal Access Token with "repo" permissions at:\n' +
              'https://github.com/settings/tokens';
          } else if (response.status === 401) {
            helpfulMessage += '\n\nAuthentication failed. Please check your GitHub token.';
          } else if (response.status === 404) {
            helpfulMessage += '\n\nRepository not found. Please check username and repository name.';
          }
          
          helpfulMessage += '\n\nDetails: ' + (errorDetails.message || errorText);
          throw new Error(helpfulMessage);
        }
        
        console.log(`✓ GitHub API ${method} ${path} successful on attempt ${attempt}`);
        return true;
      }
    } catch (err) {
      console.error(`GitHub API attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt === retries) {
        console.error('All GitHub API retries failed:', err);
        throw err;
      }
      // Wait before retry (shorter delay for faster response)
      await new Promise(resolve => setTimeout(resolve, 300 * attempt));
    }
  }
}

// Load employees from employees.json file
async function loadEmployees() {
  console.log('Loading employees from employees.json...');
  try {
    const response = await fetch('employees.json');
    if (response.ok) {
      const fileData = await response.json();
      if (fileData && Array.isArray(fileData)) {
        console.log(`✓ Loaded ${fileData.length} employees from employees.json`);
        return fileData;
      }
    }
  } catch (err) {
    console.error('Failed to load employees.json:', err.message);
  }
  
  console.warn('⚠ No employees found in employees.json');
  return [];
}

// Save employees to GitHub and localStorage
async function saveEmployees(list) {
  console.log(`Saving ${list.length} employees to employees.json...`);
  
  loadGithubConfig();
  
  if (!githubConfig.token || !githubConfig.username || !githubConfig.repo) {
    alert('GitHub not configured. Please configure GitHub settings first.');
    console.error('Cannot save: GitHub not configured');
    return false;
  }
  
  try {
    await githubApiCall('PUT', 'employees.json', list);
    console.log('✓ Employees saved to GitHub successfully');
    alert('✓ Employees saved successfully!');
    return true;
  } catch (err) {
    console.error('Failed to save employees:', err.message);
    alert('Error saving employees: ' + err.message);
    return false;
  }
}

// Load picks from localStorage first (fast), then sync from GitHub in background
async function loadPicksFromStorage() {
  console.log('=== loadPicksFromStorage called ===');
  
  // Load from localStorage FIRST (instant, no network delay)
  const saved = localStorage.getItem('pickLogs');
  let localPicks = [];
  if (saved) {
    try {
      localPicks = JSON.parse(saved);
      console.log(`✓ Picks loaded from localStorage: ${localPicks.length} entries`);
    } catch (err) {
      console.error('Failed to parse localStorage picks:', err);
    }
  }
  
  // Always reload config from localStorage to get latest
  loadGithubConfig();
  
  // Try GitHub in background (for sync, but don't block UI)
  if (githubConfig.token && githubConfig.username && githubConfig.repo) {
    // Return localStorage data immediately, sync GitHub in background
    githubApiCall('GET', 'picks.json').then(data => {
      if (data && Array.isArray(data) && data.length > localPicks.length) {
        console.log(`✓ GitHub has more picks (${data.length} vs ${localPicks.length}), updating...`);
        localStorage.setItem('pickLogs', JSON.stringify(data));
        pickLogs = data;
        updateLogStatus();
      }
    }).catch(err => {
      console.log('GitHub sync failed (using local data):', err.message);
    });
  }
  
  console.log('=== loadPicksFromStorage completed (instant from localStorage) ===');
  return localPicks;
}

// Check if a token has been used (from GitHub)
async function checkIfTokenUsed(token) {
  try {
    loadGithubConfig();
    if (!githubConfig.token || !githubConfig.username || !githubConfig.repo) {
      console.log('GitHub not configured, checking localStorage only');
      return false;
    }
    
    const usedTokens = await githubApiCall('GET', 'used-tokens.json');
    if (usedTokens && Array.isArray(usedTokens)) {
      const isUsed = usedTokens.some(t => t.token === token);
      console.log(`Token ${token} ${isUsed ? 'IS' : 'is NOT'} used (from GitHub)`);
      return isUsed;
    }
    return false;
  } catch (err) {
    console.log('Could not check used tokens from GitHub:', err.message);
    return false;
  }
}

// Mark token as used in GitHub
async function markTokenAsUsed(token, employee) {
  try {
    loadGithubConfig();
    if (!githubConfig.token || !githubConfig.username || !githubConfig.repo) {
      console.log('GitHub not configured, token only marked locally');
      return false;
    }
    
    // Get current used tokens
    let usedTokens = await githubApiCall('GET', 'used-tokens.json');
    if (!usedTokens || !Array.isArray(usedTokens)) {
      usedTokens = [];
    }
    
    // Add this token
    usedTokens.push({
      token: token,
      employee: employee,
      timestamp: new Date().toISOString()
    });
    
    // Save back to GitHub
    await githubApiCall('PUT', 'used-tokens.json', usedTokens);
    console.log('✓ Token marked as used in GitHub:', token);
    return true;
  } catch (err) {
    console.error('Failed to mark token as used in GitHub:', err.message);
    return false;
  }
}

// Save picks to GitHub and localStorage
async function savePicksToStorage(picks) {
  console.log('=== savePicksToStorage called ===');
  
  // Ensure picks is an array
  if (!Array.isArray(picks)) {
    console.error('savePicksToStorage called with invalid data:', picks);
    return false;
  }
  
  console.log('Picks to save:', JSON.stringify(picks, null, 2));
  
  // Always reload config from localStorage to get latest
  loadGithubConfig();
  console.log('GitHub config:', { 
    hasToken: !!githubConfig.token,
    tokenLength: githubConfig.token ? githubConfig.token.length : 0,
    username: githubConfig.username, 
    repo: githubConfig.repo 
  });
  
  // Save to localStorage as backup
  localStorage.setItem('pickLogs', JSON.stringify(picks));
  console.log('✓ Picks saved to localStorage');
  
  // Try to sync to GitHub (PRIMARY storage)
  if (githubConfig.token && githubConfig.username && githubConfig.repo) {
    try {
      console.log('Attempting to save to GitHub...');
      await githubApiCall('PUT', 'picks.json', picks);
      console.log('✓✓✓ PICKS SYNCED TO GITHUB SUCCESSFULLY ✓✓✓');
      console.log('=== savePicksToStorage completed successfully ===');
      return true;
    } catch (err) {
      console.error('✗✗✗ FAILED TO SYNC PICKS TO GITHUB ✗✗✗');
      console.error('Error details:', err);
      console.error('=== savePicksToStorage completed with errors ===');
      alert('Warning: Pick saved locally but failed to sync to GitHub. Error: ' + err.message);
      return false;
    }
  } else {
    console.error('✗ GitHub not configured properly!');
    console.error('Cannot save to GitHub - picks saved locally only');
    console.error('=== savePicksToStorage completed (local only) ===');
    alert('Warning: GitHub not configured. Pick saved locally only.');
    return false;
  }
}

// Save QR tokens to GitHub (master source) and localStorage (cache)
async function saveTokensToGithub(tokens, baseUrl) {
  console.log('=== saveTokensToGithub called ===');
  
  if (!tokens || typeof tokens !== 'object') {
    console.error('saveTokensToGithub called with invalid data:', tokens);
    return false;
  }
  
  // Save to localStorage as cache for faster loading
  localStorage.setItem('qrTokens', JSON.stringify(tokens));
  localStorage.setItem('qrBaseUrl', baseUrl);
  console.log('✓ Tokens cached in localStorage');
  
  // Save to GitHub as master source
  loadGithubConfig();
  if (githubConfig.token && githubConfig.username && githubConfig.repo) {
    try {
      console.log('Saving tokens to GitHub...');
      const tokenData = {
        tokens: tokens,
        baseUrl: baseUrl,
        lastUpdated: new Date().toISOString(),
        employeeCount: Object.keys(tokens).length
      };
      await githubApiCall('PUT', 'qr-tokens.json', tokenData);
      console.log('✓✓✓ TOKENS SYNCED TO GITHUB SUCCESSFULLY ✓✓✓');
      return true;
    } catch (err) {
      console.error('✗ Failed to sync tokens to GitHub:', err.message);
      alert('Warning: Tokens saved locally but failed to sync to GitHub. QR codes may differ across browsers.');
      return false;
    }
  } else {
    console.warn('GitHub not configured. Tokens saved locally only.');
    alert('Warning: GitHub not configured. QR codes may differ across browsers. Please configure GitHub in settings.');
    return false;
  }
}

// Load QR tokens from GitHub (master source) with localStorage fallback
async function loadTokensFromGithub() {
  console.log('=== loadTokensFromGithub called ===');
  
  // Always reload config
  loadGithubConfig();
  
  // Try loading from GitHub first (master source)
  if (githubConfig.token && githubConfig.username && githubConfig.repo) {
    try {
      console.log('Loading tokens from GitHub...');
      const tokenData = await githubApiCall('GET', 'qr-tokens.json');
      
      if (tokenData && tokenData.tokens) {
        console.log('✓ Tokens loaded from GitHub (master source)');
        
        // Update localStorage cache
        localStorage.setItem('qrTokens', JSON.stringify(tokenData.tokens));
        if (tokenData.baseUrl) {
          localStorage.setItem('qrBaseUrl', tokenData.baseUrl);
        }
        
        return {
          tokens: tokenData.tokens,
          baseUrl: tokenData.baseUrl || ''
        };
      }
    } catch (err) {
      console.log('Could not load tokens from GitHub:', err.message);
    }
  }
  
  // Fallback to localStorage
  console.log('Falling back to localStorage...');
  const savedTokens = localStorage.getItem('qrTokens');
  const savedUrl = localStorage.getItem('qrBaseUrl');
  
  if (savedTokens) {
    try {
      const tokens = JSON.parse(savedTokens);
      console.log('✓ Tokens loaded from localStorage (fallback)');
      return {
        tokens: tokens,
        baseUrl: savedUrl || ''
      };
    } catch (err) {
      console.error('Failed to parse localStorage tokens:', err);
    }
  }
  
  console.log('No tokens found in GitHub or localStorage');
  return null;
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
const ghParam = params.get('gh');
const emParam = params.get('em');
const startMode = params.get('mode');

// If GitHub config is in URL (QR scan on mobile), load it
if (ghParam) {
  try {
    console.log('GitHub param received:', ghParam.substring(0, 20) + '...');
    const decoded = JSON.parse(atob(ghParam));
    console.log('GitHub config decoded successfully');
    if (decoded.t && decoded.u && decoded.r) {
      saveGithubConfig({
        token: decoded.t,
        username: decoded.u,
        repo: decoded.r
      });
      console.log('✓ GitHub config loaded from QR code and saved');
      console.log('GitHub username:', decoded.u, 'repo:', decoded.r);
    } else {
      console.error('Decoded GitHub config missing required fields');
    }
  } catch (err) {
    console.error('✗ Failed to parse GitHub config from QR:', err);
  }
}

// If Email config is in URL (QR scan on mobile), load it
if (emParam) {
  try {
    console.log('Email param received');
    const decoded = JSON.parse(atob(emParam));
    console.log('Email config decoded successfully');
    if (decoded.s && decoded.t && decoded.k && decoded.e) {
      saveEmailConfig({
        serviceId: decoded.s,
        templateId: decoded.t,
        publicKey: decoded.k,
        recipientEmail: decoded.e
      });
      console.log('✓ Email config loaded from QR code and saved');
      console.log('Email recipient:', decoded.e);
    } else {
      console.error('Decoded Email config missing required fields');
    }
  } catch (err) {
    console.error('✗ Failed to parse Email config from QR:', err);
  }
}

// Load employees and then initialize
loadEmployees().then(list => {
  employeesList = list;
  
  if (startMode === 'start') {
    // Start Picker mode: show wheel with all participants
    initStartPickerMode();
  } else if (qrToken && qrEmployee) {
    // QR mode: show rules first
    initRulesPanel();
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

  document.getElementById('clearCacheBtn').addEventListener('click', () => {
    if (confirm('Clear all cached data and reload the page?')) {
      clearAllCache();
    }
  });
}

function clearAllCache() {
  console.log('Clearing all cache...');
  
  // Clear localStorage
  const keysToKeep = [];
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    keysToRemove.push(key);
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log(`✓ Cleared ${keysToRemove.length} localStorage items`);
  
  // Clear sessionStorage
  sessionStorage.clear();
  console.log('✓ Cleared sessionStorage');
  
  // Clear service worker caches if available
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
      console.log('✓ Cleared service worker caches');
    });
  }
  
  // Add timestamp to force reload
  const url = new URL(window.location.href);
  url.searchParams.set('_t', Date.now());
  
  alert('Cache cleared! The page will reload now.');
  window.location.href = url.toString();
}

function initAdminPanel() {
  const baseUrlInput = document.getElementById('baseUrl');
  const newEmployeeInput = document.getElementById('newEmployeeInput');
  const addEmployeeBtn = document.getElementById('addEmployeeBtn');

  // Load EmailJS config into form
  loadEmailConfig();
  if (emailConfig.serviceId) {
    document.getElementById('emailServiceId').value = emailConfig.serviceId;
    document.getElementById('emailTemplateId').value = emailConfig.templateId || '';
    document.getElementById('emailPublicKey').value = emailConfig.publicKey || '';
    document.getElementById('recipientEmail').value = emailConfig.recipientEmail || 'depace.newa@gmail.com';
    document.getElementById('emailStatus').textContent = '✓ Email configured';
    document.getElementById('emailStatus').style.color = 'green';
  }

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

  // Auto-load existing QR codes if they exist
  autoLoadQRCodes();

  // EmailJS config handlers
  document.getElementById('saveEmailConfig').addEventListener('click', () => {
    const serviceId = document.getElementById('emailServiceId').value.trim();
    const templateId = document.getElementById('emailTemplateId').value.trim();
    const publicKey = document.getElementById('emailPublicKey').value.trim();
    const recipientEmail = document.getElementById('recipientEmail').value.trim();

    if (!serviceId || !templateId || !publicKey || !recipientEmail) {
      alert('Please fill all email fields');
      return;
    }

    saveEmailConfig({ serviceId, templateId, publicKey, recipientEmail });
    document.getElementById('emailStatus').textContent = '✓ Email config saved!';
    document.getElementById('emailStatus').style.color = 'green';
  });

  document.getElementById('testEmail').addEventListener('click', async () => {
    const statusEl = document.getElementById('emailStatus');
    statusEl.textContent = 'Sending test email...';
    statusEl.style.color = 'blue';

    const success = await sendPickEmail('Test Giver', 'Test Receiver');
    if (success) {
      statusEl.textContent = '✓ Test email sent successfully!';
      statusEl.style.color = 'green';
    } else {
      statusEl.textContent = '✗ Test email failed. Check console for errors.';
      statusEl.style.color = 'red';
    }
  });

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
    statusEl.textContent = 'Testing connection...';
    statusEl.style.color = 'blue';

    try {
      loadGithubConfig();
      
      // First test: Check if we can read from the repo
      statusEl.textContent = 'Step 1/2: Testing read access...';
      await githubApiCall('GET', 'employees.json');
      
      // Second test: Check if we can write to the repo
      statusEl.textContent = 'Step 2/2: Testing write access...';
      const testData = { test: true, timestamp: new Date().toISOString() };
      await githubApiCall('PUT', 'connection-test.json', testData);
      
      statusEl.textContent = '✓ Connection successful! Read and write permissions verified.';
      statusEl.style.color = 'green';
    } catch (err) {
      console.error('GitHub connection test failed:', err);
      statusEl.textContent = '✗ Connection failed: ' + err.message;
      statusEl.style.color = 'red';
      
      // Show detailed error in console for debugging
      console.error('Full error details:', err);
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
  addEmployeeBtn.addEventListener('click', async () => {
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
    const saved = await saveEmployees(employeesList);
    if (saved) {
      newEmployeeInput.value = '';
      // Reload from file to ensure consistency
      employeesList = await loadEmployees();
      renderEmployeesList();
    } else {
      // Revert the change if save failed
      employeesList.pop();
    }
  });

  // Allow Enter key to add employee
  newEmployeeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addEmployeeBtn.click();
    }
  });

  // Sync employees from GitHub
  document.getElementById('syncEmployeesBtn').addEventListener('click', async () => {
    const btn = document.getElementById('syncEmployeesBtn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Syncing...';
    btn.disabled = true;
    
    try {
      // Reload from employees.json file
      employeesList = await loadEmployees();
      renderEmployeesList();
      btn.textContent = '✓ Synced!';
      btn.style.background = '#4CAF50';
      alert(`✓ Successfully synced ${employeesList.length} employees from employees.json`);
      
      // Reset button after 2 seconds
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2000);
    } catch (err) {
      console.error('Sync failed:', err);
      btn.textContent = '✗ Failed';
      btn.style.background = '#f44336';
      alert('Failed to sync employees: ' + err.message);
      
      // Reset button after 2 seconds
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '#4CAF50';
        btn.disabled = false;
      }, 2000);
    }
  });

  // Base URL handling
  document.getElementById('loadDefaultUrl').addEventListener('click', () => {
    const loc = window.location;
    const guess = loc.origin + loc.pathname;
    baseUrlInput.value = guess;
  });

  // Token generation
  document.getElementById('generateTokens').addEventListener('click', async () => {
    const base = baseUrlInput.value.trim();
    if (!base) { alert('Enter base URL to generate.'); return; }
    if (employeesList.length === 0) { alert('Add employees first.'); return; }
    
    const tokens = generateTokens();
    
    // Save to GitHub and localStorage
    const saved = await saveTokensToGithub(tokens, base);
    if (saved) {
      console.log('✓ Tokens synced to GitHub - will be consistent across all browsers');
    } else {
      console.warn('⚠ Tokens saved locally only - may differ across browsers');
    }
    
    renderGrid(base, tokens);
  });

  document.getElementById('reuseTokens').addEventListener('click', async () => {
    const base = baseUrlInput.value.trim();
    if (!base) { alert('Enter base URL to render.'); return; }
    
    // Load from GitHub first, fallback to localStorage
    const tokenData = await loadTokensFromGithub();
    
    if (!tokenData || !tokenData.tokens) {
      alert('No tokens found. Click "Generate Tokens" first.');
      return;
    }
    
    // If baseUrl changed, update GitHub
    if (tokenData.baseUrl !== base) {
      await saveTokensToGithub(tokenData.tokens, base);
    }
    
    renderGrid(base, tokenData.tokens);
  });

  document.getElementById('printSheet').addEventListener('click', () => window.print());
  document.getElementById('downloadCSV').addEventListener('click', downloadCSV);
  
  document.getElementById('resetQRCodes').addEventListener('click', async () => {
    if (confirm('⚠️ Are you sure you want to reset all QR codes?\n\nThis will:\n- Delete all existing QR codes\n- Clear all tokens (from GitHub and locally)\n- Require generating new QR codes\n\nContinue?')) {
      // Clear localStorage
      localStorage.removeItem('qrTokens');
      localStorage.removeItem('qrBaseUrl');
      
      // Clear GitHub
      loadGithubConfig();
      if (githubConfig.token && githubConfig.username && githubConfig.repo) {
        try {
          await githubApiCall('PUT', 'qr-tokens.json', { tokens: {}, baseUrl: '', lastUpdated: new Date().toISOString() });
          console.log('✓ QR tokens cleared from GitHub');
        } catch (err) {
          console.error('Failed to clear tokens from GitHub:', err.message);
        }
      }
      
      document.getElementById('qrGrid').innerHTML = '<p style="text-align:center; color:#999; padding: 20px;">QR codes cleared. Click "Generate Tokens" to create new ones.</p>';
      alert('✓ QR codes reset successfully!');
    }
  });

  // Picks management handlers
  document.getElementById('adminRefreshPicks').addEventListener('click', async () => {
    const picks = await loadPicksFromStorage();
    renderAdminPicksList(picks);
  });

  document.getElementById('adminDownloadPicks').addEventListener('click', async () => {
    const picks = await loadPicksFromStorage();
    if (!picks || picks.length === 0) {
      alert('No picks available to download. Check if picks have been recorded.');
      return;
    }
    downloadPicks(picks);
  });

  document.getElementById('adminClearPicks').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all picks? This cannot be undone.')) {
      localStorage.setItem('pickLogs', JSON.stringify([]));
      savePicksToStorage([]);
      renderAdminPicksList([]);
      alert('All picks cleared and synced to GitHub');
    }
  });

  document.getElementById('adminResetAssignments').addEventListener('click', async () => {
    if (confirm('⚠️ WARNING: This will regenerate the closed-loop assignments.\n\nOnly do this if:\n- You added/removed employees\n- There are duplicate picks\n- You need to restart the gift exchange\n\nThis will NOT clear existing picks. Continue?')) {
      try {
        // Clear localStorage
        localStorage.removeItem('closedLoopAssignments');
        
        // Clear GitHub
        loadGithubConfig();
        if (githubConfig.token && githubConfig.username && githubConfig.repo) {
          const emptyData = {
            assignments: {},
            employees: [],
            createdAt: null,
            totalEmployees: 0
          };
          await githubApiCall('PUT', 'assignments.json', emptyData);
          alert('✓ Assignments reset! New assignments will be generated when the next person spins.');
        } else {
          alert('✓ Local assignments cleared. Configure GitHub to sync across all devices.');
        }
      } catch (err) {
        alert('Error resetting assignments: ' + err.message);
      }
    }
  });

  // Load and display picks on admin login
  loadPicksFromStorage().then(picks => {
    renderAdminPicksList(picks);
  });

  // Auto-refresh picks every 3 seconds to show new picks immediately
  setInterval(async () => {
    const picks = await loadPicksFromStorage();
    renderAdminPicksList(picks);
  }, 3000);
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

function renderAdminPicksList(picks) {
  console.log('renderAdminPicksList called with picks:', picks);
  const listContainer = document.getElementById('adminPicksList');
  
  if (!picks || picks.length === 0) {
    console.log('No picks to display');
    listContainer.innerHTML = '<p style="text-align:center; color:#999;">No picks recorded yet</p>';
    return;
  }

  listContainer.innerHTML = '';
  picks.forEach(pick => {
    console.log('Rendering pick:', pick);
    const item = document.createElement('div');
    item.style.cssText = 'padding: 8px; margin: 6px 0; background: white; border: 1px solid #ddd; border-radius: 4px; font-family: monospace;';
    const time = new Date(pick.timeISO).toLocaleString();
    item.textContent = `${time} | ${pick.giver} → ${pick.receiver}`;
    listContainer.appendChild(item);
  });
}

function downloadPicks(picks) {
  if (!picks || picks.length === 0) {
    alert('No picks to download');
    return;
  }
  
  const content = picks
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
}

async function removeEmployee(index) {
  const employeeName = employeesList[index];
  if (confirm(`Remove ${employeeName}?`)) {
    const removedEmployee = employeesList.splice(index, 1)[0];
    const saved = await saveEmployees(employeesList);
    if (saved) {
      // Reload from file to ensure consistency
      employeesList = await loadEmployees();
      renderEmployeesList();
    } else {
      // Revert the change if save failed
      employeesList.splice(index, 0, removedEmployee);
    }
  }
}

async function autoLoadQRCodes() {
  console.log('Auto-loading QR codes from GitHub...');
  
  // Load from GitHub first (master source), fallback to localStorage
  const tokenData = await loadTokensFromGithub();
  
  // Set the base URL
  const baseUrl = (tokenData && tokenData.baseUrl) || (window.location.origin + window.location.pathname);
  document.getElementById('baseUrl').value = baseUrl;
  
  if (tokenData && tokenData.tokens && Object.keys(tokenData.tokens).length > 0) {
    // Render the QR codes (includes START PICKER)
    renderGrid(baseUrl, tokenData.tokens);
    console.log('✓ Auto-loaded existing QR codes from GitHub');
  } else {
    // No tokens yet - show at least the START PICKER QR code
    console.log('No existing employee tokens found, showing START PICKER only');
    renderStartPickerOnly(baseUrl);
  }
}

function renderStartPickerOnly(baseUrl) {
  const grid = document.getElementById('qrGrid');
  grid.innerHTML = '';
  
  // Add START PICKER card
  const startPickerUrl = `${baseUrl}?mode=start`;
  const startCard = document.createElement('div');
  startCard.className = 'card print-area';
  startCard.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  startCard.style.color = 'white';
  startCard.style.border = '3px solid #fff';
  const startTitle = document.createElement('h3');
  startTitle.textContent = '🎯 START PICKER';
  startTitle.style.color = 'white';
  startTitle.style.fontSize = '18px';
  startTitle.style.fontWeight = 'bold';
  const startDesc = document.createElement('div');
  startDesc.textContent = 'Spin to pick who goes first!';
  startDesc.style.fontSize = '12px';
  startDesc.style.marginBottom = '8px';
  startDesc.style.color = '#f0f0f0';
  const startQrEl = document.createElement('div');
  startQrEl.style.margin = '8px auto';
  startQrEl.style.background = 'white';
  startQrEl.style.padding = '8px';
  startQrEl.style.borderRadius = '8px';
  startCard.appendChild(startTitle);
  startCard.appendChild(startDesc);
  startCard.appendChild(startQrEl);
  grid.appendChild(startCard);
  new QRCode(startQrEl, { text: startPickerUrl, width: 180, height: 180 });
  
  // Add a helpful message
  const messageDiv = document.createElement('div');
  messageDiv.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 20px; background: #fff3cd; border-radius: 8px; margin-top: 10px;';
  messageDiv.innerHTML = '<strong>ℹ️ No employee tokens generated yet.</strong><br>Click "Generate Tokens" to create QR codes for all employees.';
  grid.appendChild(messageDiv);
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
  
  // Add special START PICKER card first
  const startPickerUrl = `${baseUrl}?mode=start`;
  const startCard = document.createElement('div');
  startCard.className = 'card print-area';
  startCard.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  startCard.style.color = 'white';
  startCard.style.border = '3px solid #fff';
  const startTitle = document.createElement('h3');
  startTitle.textContent = '🎯 START PICKER';
  startTitle.style.color = 'white';
  startTitle.style.fontSize = '18px';
  startTitle.style.fontWeight = 'bold';
  const startDesc = document.createElement('div');
  startDesc.textContent = 'Spin to pick who goes first!';
  startDesc.style.fontSize = '12px';
  startDesc.style.marginBottom = '8px';
  startDesc.style.color = '#f0f0f0';
  const startQrEl = document.createElement('div');
  startQrEl.style.margin = '8px auto';
  startQrEl.style.background = 'white';
  startQrEl.style.padding = '8px';
  startQrEl.style.borderRadius = '8px';
  startCard.appendChild(startTitle);
  startCard.appendChild(startDesc);
  startCard.appendChild(startQrEl);
  grid.appendChild(startCard);
  new QRCode(startQrEl, { text: startPickerUrl, width: 180, height: 180 });
  
  // Add employee cards
  employeesList.forEach(name => {
    const token = tokens[name];
    // Include GitHub and Email configs in URL for mobile sync
    let url = `${baseUrl}?code=${encodeURIComponent(token)}&employee=${encodeURIComponent(name)}`;
    
    if (githubConfig.token && githubConfig.username && githubConfig.repo) {
      const configStr = btoa(JSON.stringify({
        t: githubConfig.token,
        u: githubConfig.username,
        r: githubConfig.repo
      }));
      url += `&gh=${configStr}`;
    }
    
    if (emailConfig.serviceId && emailConfig.templateId && emailConfig.publicKey) {
      const emailStr = btoa(JSON.stringify({
        s: emailConfig.serviceId,
        t: emailConfig.templateId,
        k: emailConfig.publicKey,
        e: emailConfig.recipientEmail
      }));
      url += `&em=${emailStr}`;
    }
    const card = document.createElement('div');
    card.className = 'card print-area';
    const title = document.createElement('h3');
    title.textContent = name;
    const qrEl = document.createElement('div');
    qrEl.style.margin = '8px auto';
    card.appendChild(title);
    card.appendChild(qrEl);
    grid.appendChild(card);
    new QRCode(qrEl, { text: url, width: 180, height: 180 });
  });
}

async function downloadCSV() {
  // Load from GitHub first, fallback to localStorage
  const tokenData = await loadTokensFromGithub();
  
  if (!tokenData || !tokenData.tokens) {
    alert('No tokens generated yet.');
    return;
  }
  
  const tokens = tokenData.tokens;
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

// Show rules modal popup when QR is scanned
// ===== START PICKER MODE =====
function initStartPickerMode() {
  console.log('initStartPickerMode called');
  
  // Hide login and admin panels, show wheel
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('adminPanel').classList.add('hidden');
  document.getElementById('wheelPanel').classList.remove('hidden');

  // Set up the UI for start picker
  document.getElementById('employeeName').textContent = '🎯 Who goes first?';
  document.getElementById('qrError').textContent = '';
  
  // Use all employees for the wheel (shuffled for visual variety)
  const allParticipants = shuffleArray([...employeesList]);
  
  // Create segments for the wheel
  const segments = allParticipants.map((name, index) => ({
    fillStyle: getSegmentColor(index, allParticipants.length),
    text: name
  }));
  
  // Create the wheel
  if (typeof Winwheel === 'undefined') {
    console.error('Winwheel library not loaded');
    document.getElementById('qrError').textContent = 'Error: Wheel library not loaded. Please refresh the page.';
    return;
  }
  
  let theWheel = new Winwheel({
    canvasId: "wheelCanvas",
    numSegments: segments.length,
    segments: segments,
    animation: {
      type: "spinToStop",
      duration: 5,
      spins: 8,
      callbackFinished: (segment) => {
        // Announce the result for start picker
        const selectedName = segment.text;
        const resultEl = document.getElementById('resultText');
        resultEl.innerText = `🎉 ${selectedName} will start the gift exchange!`;
        resultEl.style.color = '#667eea';
        resultEl.style.fontSize = '24px';
        resultEl.style.fontWeight = 'bold';
        
        // Re-enable button for another spin
        const spinBtn = document.getElementById('startSpin');
        spinBtn.disabled = false;
        spinBtn.textContent = 'SPIN AGAIN';
        
        // Stop name display
        const nameDisplay = document.getElementById('nameDisplay');
        if (nameDisplay) {
          nameDisplay.textContent = selectedName;
          setTimeout(() => {
            nameDisplay.style.display = 'none';
          }, 3000);
        }
      },
      callbackAfter: drawPointer
    }
  });
  
  // Draw pointer
  drawPointer();
  
  // Enable the spin button
  const spinBtn = document.getElementById('startSpin');
  spinBtn.disabled = false;
  spinBtn.textContent = 'SPIN THE WHEEL';
  
  // Add click handler for spinning
  spinBtn.onclick = () => {
    // Clear previous result
    document.getElementById('resultText').textContent = '';
    
    spinBtn.disabled = true;
    spinBtn.textContent = 'SPINNING...';
    
    // Start name scrolling animation
    const nameDisplay = document.getElementById('nameDisplay');
    if (nameDisplay) {
      nameDisplay.style.display = 'block';
      let scrollIndex = 0;
      const scrollInterval = setInterval(() => {
        nameDisplay.textContent = allParticipants[scrollIndex % allParticipants.length];
        scrollIndex++;
      }, 100);
      
      // Stop scrolling when wheel stops
      setTimeout(() => {
        clearInterval(scrollInterval);
      }, 5000);
    }
    
    // Pick a random winner
    const randomDeg = Math.floor(Math.random() * 360) + 1440; // At least 4 full rotations
    
    theWheel.animation.stopAngle = randomDeg;
    theWheel.startAnimation();
  };
  
  // Ensure the wheel can spin multiple times - no token validation needed
  console.log('Start Picker Mode initialized with', employeesList.length, 'participants');
}

function initRulesPanel() {
  console.log('initRulesPanel called');
  
  // Get QR parameters
  const params = new URLSearchParams(window.location.search);
  const qrEmployee = params.get('employee');
  const qrCode = params.get('code');
  
  console.log('initRulesPanel - QR Parameters:', { qrEmployee, qrCode });
  
  // Use already loaded employee list (loaded at page startup)
  // Validate employee exists
  if (!qrEmployee || !employeesList.includes(qrEmployee)) {
    console.error('Employee not found:', qrEmployee);
    console.error('Available employees:', employeesList);
    alert(`Employee "${qrEmployee}" not found in the system. Please check the QR code.`);
    return;
  }
  
  // Display employee name in rules modal
  const rulesEmployeeEl = document.getElementById('rulesEmployeeName');
  if (rulesEmployeeEl) {
    rulesEmployeeEl.textContent = qrEmployee;
  } else {
    console.error('rulesEmployeeName element not found');
    return;
  }

  // Show the modal IMMEDIATELY
  const overlay = document.getElementById('rulesModalOverlay');
  const modal = document.getElementById('rulesModal');
  
  if (!overlay || !modal) {
    console.error('Modal elements not found');
    return;
  }
  
  overlay.classList.add('show');
  modal.classList.add('show');
  console.log('Modal shown');

  // Remove existing event listeners by cloning elements
  const continueBtn = document.getElementById('continueToWheel');
  const closeBtn = document.getElementById('closeRulesModal');
  
  if (continueBtn) {
    const newContinueBtn = continueBtn.cloneNode(true);
    continueBtn.parentNode.replaceChild(newContinueBtn, continueBtn);
    
    newContinueBtn.addEventListener('click', () => {
      console.log('Continue button clicked');
      overlay.classList.remove('show');
      modal.classList.remove('show');
      initWheelApp();
    });
  }
  
  if (closeBtn) {
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    
    newCloseBtn.addEventListener('click', () => {
      console.log('Close button clicked');
      overlay.classList.remove('show');
      modal.classList.remove('show');
    });
  }
  
  overlay.addEventListener('click', () => {
    console.log('Overlay clicked');
    overlay.classList.remove('show');
    modal.classList.remove('show');
  });
}

async function initWheelApp() {
  // Show UI immediately
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('adminPanel').classList.add('hidden');
  document.getElementById('wheelPanel').classList.remove('hidden');

  // Use already loaded employee list (no need to reload)
  console.log('initWheelApp: Using cached employee list:', employeesList.length, 'employees');
  employees = shuffleArray(employeesList);

  // Get QR parameters for validation
  const params = new URLSearchParams(window.location.search);
  const qrEmployee = params.get('employee');
  const qrToken = params.get('code');
  
  // Load picks in background (non-blocking)
  loadPicksFromStorage().then(logs => {
    pickLogs = logs;
    updateLogStatus();
  }).catch(err => {
    console.error('Failed to load picks:', err);
    pickLogs = [];
    updateLogStatus();
  });

  // Validate QR params - must use the freshly loaded employeesList
  if (!qrEmployee || !employeesList.includes(qrEmployee)) {
    console.error('Validation failed. qrEmployee:', qrEmployee, 'employeesList:', employeesList);
    document.getElementById('qrError').textContent = 'Invalid or missing QR code. Please scan a valid QR code.';
    document.getElementById('startSpin').disabled = true;
    return;
  }

  currentEmployee = qrEmployee;
  deviceId = `qr-${qrToken}`;

  // Display employee name
  document.getElementById('employeeName').textContent = currentEmployee;

  // Load closed-loop assignments from GitHub (master source)
  console.log('Loading closed-loop assignments...');
  assignments = await loadClosedLoopAssignments(employees);
  console.log('Assignments loaded:', assignments);

  // Prepare inverse map to grey out receivers
  assignedReceivers = Object.fromEntries(Object.entries(assignments).map(([giver, receiver]) => [receiver, giver]));

  // One-time check for token - check both localStorage AND GitHub
  const isUsedLocally = localStorage.getItem(`spunToken:${qrToken}`) === 'true';
  const isUsedInGithub = await checkIfTokenUsed(qrToken);
  
  if (isUsedLocally || isUsedInGithub) {
    document.getElementById('startSpin').disabled = true;
    document.getElementById('resultText').innerText = 'This QR has already been used to spin. Each QR code can only be used once.';
    document.getElementById('resultText').style.color = 'red';
  } else {
    // Build wheel immediately (synchronous, fast)
    buildWheel();
    // Enable button after wheel is ready
    document.getElementById('startSpin').disabled = false;
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
  // Vibrant, colorful palette with great contrast
  const colors = [
    '#FF6B6B',  // Red
    '#4ECDC4',  // Turquoise
    '#FFE66D',  // Yellow
    '#95E1D3',  // Mint
    '#FF8C42',  // Orange
    '#6BCB77',  // Green
    '#4D96FF',  // Blue
    '#9D84B7',  // Purple
    '#FF6B9D',  // Pink
    '#A8D8EA',  // Light Blue
    '#FF6F61',  // Coral
    '#F7DC6F',  // Golden Yellow
    '#BB8FCE',  // Light Purple
    '#85C1E2',  // Sky Blue
    '#F8B88B',  // Peach
    '#52C9A8',  // Teal
    '#FF85B3',  // Hot Pink
    '#FFD93D',  // Bright Yellow
    '#6BCB77',  // Forest Green
    '#D4A5FF'   // Lavender
  ];
  return colors[index % colors.length];
}

function drawPointer() {
  const canvas = document.getElementById('wheelCanvas');
  const ctx = canvas.getContext('2d');
  
  // Draw arrow pointer outside wheel at top, pointing down toward wheel
  ctx.save();
  
  // Draw shadow for 3D effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.moveTo(250, 18);
  ctx.lineTo(233, 52);
  ctx.lineTo(267, 52);
  ctx.closePath();
  ctx.fill();
  
  // Draw main pointer with gradient
  const gradient = ctx.createLinearGradient(250, 15, 250, 50);
  gradient.addColorStop(0, '#FFD700');    // Gold top
  gradient.addColorStop(0.5, '#FFA500');  // Orange middle
  gradient.addColorStop(1, '#FF8C00');    // Dark orange bottom
  
  ctx.fillStyle = gradient;
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 4;
  
  ctx.beginPath();
  ctx.moveTo(250, 15);   // Top point (outside wheel)
  ctx.lineTo(235, 50);   // Left point
  ctx.lineTo(265, 50);   // Right point
  ctx.closePath();
  
  ctx.fill();
  ctx.stroke();
  
  // Add shine effect on top
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.moveTo(250, 18);
  ctx.lineTo(240, 38);
  ctx.lineTo(260, 38);
  ctx.closePath();
  ctx.fill();
  
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
  console.log('=== attemptAssignment called ===');
  console.log('Current Employee:', currentEmployee);
  console.log('Selected Name:', selectedName);
  
  const resultEl = document.getElementById('resultText');

  // Local-only: mapping already set; mark token/employee as spun and persist
  const localCycle = JSON.stringify(assignments);
  localStorage.setItem('closedLoopAssignments', localCycle);
  
  const params = new URLSearchParams(window.location.search);
  const qrToken = params.get('code');
  console.log('QR Token:', qrToken);
  
  if (qrToken) {
    // Mark as used locally
    localStorage.setItem(`spunToken:${qrToken}`, 'true');
    console.log('Token marked as used locally:', qrToken);
    
    // Mark as used in GitHub (cross-device)
    await markTokenAsUsed(qrToken, currentEmployee);
  } else {
    localStorage.setItem(`spun:${currentEmployee}`, 'true');
    console.log('Employee marked as spun:', currentEmployee);
  }
  
  resultEl.innerText = `🎁 ${currentEmployee} will gift to ${selectedName}!`;
  resultEl.style.color = 'green';
  document.getElementById('startSpin').disabled = true;
  
  console.log('Calling addLogEntry...');
  const saved = await addLogEntry(currentEmployee, selectedName);
  
  // Add visual feedback about sync status
  setTimeout(() => {
    loadGithubConfig();
    if (githubConfig.token && githubConfig.username && githubConfig.repo) {
      resultEl.innerText += '\n✓ Synced to GitHub';
    } else {
      resultEl.innerText += '\n⚠ Saved locally only';
    }
  }, 1000);
  
  console.log('=== attemptAssignment completed ===');
  return;
}

// Load closed-loop assignments from GitHub, or generate if not exists
async function loadClosedLoopAssignments(employeeList) {
  try {
    loadGithubConfig();
    
    // Try to load from GitHub first (master source)
    if (githubConfig.token && githubConfig.username && githubConfig.repo) {
      const stored = await githubApiCall('GET', 'assignments.json');
      
      if (stored && stored.assignments && stored.employees) {
        // Validate that stored assignments match current employee list
        const storedEmployees = new Set(stored.employees);
        const currentEmployees = new Set(employeeList);
        
        // Check if employee lists match
        const listsMatch = 
          storedEmployees.size === currentEmployees.size &&
          [...storedEmployees].every(emp => currentEmployees.has(emp));
        
        if (listsMatch) {
          console.log('✓ Using existing assignments from GitHub');
          return stored.assignments;
        } else {
          console.log('⚠ Employee list changed, need to regenerate assignments');
        }
      }
    }
  } catch (err) {
    console.log('Could not load assignments from GitHub:', err.message);
  }
  
  // Generate new assignments
  console.log('Generating new closed-loop assignments for', employeeList.length, 'employees');
  const newAssignments = generateClosedLoop(employeeList);
  
  // Save to GitHub
  await saveClosedLoopAssignments(newAssignments, employeeList);
  
  return newAssignments;
}

// Save closed-loop assignments to GitHub
async function saveClosedLoopAssignments(assignments, employeeList) {
  try {
    loadGithubConfig();
    
    if (githubConfig.token && githubConfig.username && githubConfig.repo) {
      const data = {
        assignments: assignments,
        employees: employeeList,
        createdAt: new Date().toISOString(),
        totalEmployees: employeeList.length
      };
      
      await githubApiCall('PUT', 'assignments.json', data);
      console.log('✓ Assignments saved to GitHub');
      
      // Also save to localStorage as backup
      localStorage.setItem('closedLoopAssignments', JSON.stringify(data));
    } else {
      console.log('GitHub not configured, saving locally only');
      localStorage.setItem('closedLoopAssignments', JSON.stringify({ assignments, employees: employeeList }));
    }
  } catch (err) {
    console.error('Failed to save assignments:', err.message);
    // Fallback to localStorage
    localStorage.setItem('closedLoopAssignments', JSON.stringify({ assignments, employees: employeeList }));
  }
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
  
  // Validate the closed loop
  console.log('Generated closed loop:');
  let current = order[0];
  const chain = [current];
  for (let i = 0; i < list.length - 1; i++) {
    current = map[current];
    chain.push(current);
  }
  console.log('Chain:', chain.join(' → '));
  console.log('Forms complete loop:', map[current] === order[0]);
  
  return map;
}

// --- Logging & export ---
async function addLogEntry(giver, receiver) {
  console.log('=== addLogEntry called ===');
  console.log('Giver:', giver, 'Receiver:', receiver);
  
  const entry = { timeISO: new Date().toISOString(), giver, receiver };
  
  // Load current picks from storage to ensure we don't lose data
  const currentPicks = await loadPicksFromStorage();
  console.log('Current picks loaded:', currentPicks.length, 'entries');
  
  // Prevent duplicates for same giver
  const exists = currentPicks.some(e => e.giver === giver);
  if (!exists) {
    currentPicks.push(entry);
    console.log('New pick added. Total picks now:', currentPicks.length);
    
    // Send email notification FIRST
    console.log('📧 Sending email notification...');
    const emailSent = await sendPickEmail(giver, receiver);
    if (emailSent) {
      console.log('✓ Email notification sent successfully');
    } else {
      console.warn('⚠ Email notification failed or not configured');
    }
    
    // Save to both localStorage and GitHub
    const saved = await savePicksToStorage(currentPicks);
    
    if (saved) {
      console.log('✓ Pick successfully saved and synced to GitHub');
    } else {
      console.warn('⚠ Pick saved locally but not synced to GitHub');
    }
    
    // Also update the global pickLogs
    pickLogs = currentPicks;
    updateLogStatus();
    console.log('=== addLogEntry completed ===');
    return saved;
  } else {
    console.log('Duplicate pick detected for giver:', giver);
    updateLogStatus();
    console.log('=== addLogEntry completed (duplicate) ===');
    return false;
  }
}

function updateLogStatus() {
  const el = document.getElementById('logStatus');
  if (!el) return;
  el.textContent = `Log entries: ${pickLogs.length}`;
}

// Download log as a text file
// Note: Only admin can download picks from admin panel


