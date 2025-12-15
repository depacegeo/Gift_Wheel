# How Picks are Saved - Complete Flow Analysis

## Overview
The application saves gift picks in a multi-step process when a user spins the wheel and gets their result.

---

## Step-by-Step Flow

### **Step 1: User Spins Wheel**
- User clicks "SPIN" button
- Wheel animation runs for ~5 seconds
- Animation completes and `announceResult()` is called

### **Step 2: Result Announcement** (`announceResult()` - Line 803)
```javascript
nameDisplay.textContent = selectedName;
setTimeout(() => {
  nameDisplay.style.display = 'none';
}, 3000);
attemptAssignment(selectedName);
```
- Displays the selected name for 3 seconds
- Calls `attemptAssignment(selectedName)` to save the pick
- **selectedName** = the person they will gift to

### **Step 3: Attempt Assignment** (`attemptAssignment()` - Line 821)
```javascript
async function attemptAssignment(selectedName) {
  const resultEl = document.getElementById('resultText');
  
  // Mark token as used
  const localCycle = JSON.stringify(assignments);
  localStorage.setItem('closedLoopAssignments', localCycle);
  
  const params = new URLSearchParams(window.location.search);
  const qrToken = params.get('code');
  
  if (qrToken) {
    localStorage.setItem(`spunToken:${qrToken}`, 'true');
  }
  
  // Show result message
  resultEl.innerText = `🎁 ${currentEmployee} will gift to ${selectedName}!`;
  resultEl.style.color = 'green';
  document.getElementById('startSpin').disabled = true;
  
  // ADD THE PICK TO LOG
  await addLogEntry(currentEmployee, selectedName);
  return;
}
```

**What happens here:**
1. Saves the closed-loop assignments to localStorage
2. Marks the QR token as used (prevents re-use)
3. Disables the spin button
4. **Calls `addLogEntry(giver, receiver)`** ← This is where picks are saved!

### **Step 4: Add Log Entry** (`addLogEntry()` - Line 855)
```javascript
async function addLogEntry(giver, receiver) {
  console.log('addLogEntry called with:', { giver, receiver });
  
  // Create entry object with timestamp
  const entry = { 
    timeISO: new Date().toISOString(), 
    giver, 
    receiver 
  };
  
  // STEP 1: Load current picks from storage
  const currentPicks = await loadPicksFromStorage();
  console.log('Current picks before adding:', currentPicks);
  
  // STEP 2: Check for duplicates
  const exists = currentPicks.some(e => e.giver === giver);
  
  if (!exists) {
    // STEP 3: Add new pick to array
    currentPicks.push(entry);
    console.log('New pick added, total picks now:', currentPicks);
    
    // STEP 4: SAVE to both localStorage and GitHub
    await savePicksToStorage(currentPicks);
    
    // STEP 5: Update global variable
    pickLogs = currentPicks;
  } else {
    console.log('Duplicate pick detected for giver:', giver);
  }
  
  updateLogStatus();
}
```

### **Step 5: Save to Storage** (`savePicksToStorage()` - Line 138)
```javascript
async function savePicksToStorage(picks) {
  // Validate data
  if (!Array.isArray(picks)) {
    console.error('Invalid data:', picks);
    return;
  }
  
  // STEP A: Save to localStorage
  localStorage.setItem('pickLogs', JSON.stringify(picks));
  console.log('Picks saved to localStorage:', picks);
  
  // STEP B: Try to sync to GitHub if configured
  loadGithubConfig();
  if (githubConfig.token) {
    try {
      await githubApiCall('PUT', 'picks.json', picks);
      console.log('Picks synced to GitHub successfully');
    } catch (err) {
      console.log('Failed to sync picks to GitHub:', err.message);
    }
  }
}
```

---

## Data Structure

### **Entry Format**
When a pick is saved, it creates an object like:
```javascript
{
  timeISO: "2025-12-15T10:30:45.123Z",  // Timestamp when pick was made
  giver: "Dipesh",                        // Employee who is gifting
  receiver: "Safala"                      // Employee receiving the gift
}
```

### **Storage Location 1: localStorage**
**Key:** `pickLogs`
**Value:** JSON array of entry objects
```javascript
[
  { timeISO: "2025-12-15T10:30:45.123Z", giver: "Dipesh", receiver: "Safala" },
  { timeISO: "2025-12-15T10:31:20.456Z", giver: "Pramada", receiver: "Bikram" },
  ...
]
```

### **Storage Location 2: GitHub (Optional)**
**File:** `picks.json` in configured GitHub repository
- Same data structure as localStorage
- Synced automatically if GitHub is configured
- Acts as cloud backup and multi-device sync

---

## Fallback Mechanism

### **If GitHub is NOT configured:**
```
Spin Wheel → addLogEntry() → loadPicksFromStorage() 
  → reads from localStorage only
  → savePicksToStorage() → saves to localStorage only
  → Result: Picks stored locally in this browser
```

### **If GitHub IS configured:**
```
Spin Wheel → addLogEntry() → loadPicksFromStorage()
  → tries GitHub first, falls back to localStorage
  → savePicksToStorage() → saves to BOTH localStorage AND GitHub
  → Result: Picks stored locally AND in GitHub
```

---

## Duplicate Prevention

Before saving a pick, the code checks if this employee already has a pick:
```javascript
const exists = currentPicks.some(e => e.giver === giver);
if (!exists) {
  // Only add if this is the first time this employee picked
  currentPicks.push(entry);
  await savePicksToStorage(currentPicks);
}
```

This ensures each employee can only pick **ONCE**.

---

## How Admin Downloads Picks

**File:** `downloadPicks()` function (Line 434)

1. Admin clicks "Download Picks" button
2. Function gets picks from `loadPicksFromStorage()`
3. Converts picks to text format:
   ```
   2025-12-15 10:30:45 | Dipesh → Safala
   2025-12-15 10:31:20 | Pramada → Bikram
   ```
4. Creates a file named `picks.txt`
5. Downloads to user's computer

---

## What Could Go Wrong?

### **Issue 1: Picks not saving**
**Cause:** `savePicksToStorage()` is not being called
**Fix:** Check that `addLogEntry()` is called from `attemptAssignment()`

### **Issue 2: Picks save locally but not to GitHub**
**Cause:** GitHub configuration is not set up
**Fix:** Configure GitHub in admin panel (Token, Username, Repo)

### **Issue 3: Can't load picks to download**
**Cause:** `loadPicksFromStorage()` returns empty array
**Possible reasons:**
- No picks have been saved yet
- `pickLogs` localStorage key is empty
- GitHub file doesn't exist

### **Issue 4: Multiple picks from same employee**
**Cause:** Duplicate check failed
**Fix:** The code prevents this with the `exists` check

---

## Summary

The pick saving process:
1. **Trigger:** User completes spin → `announceResult()` is called
2. **Create Entry:** Build object with `{ timeISO, giver, receiver }`
3. **Load Existing:** Get all previous picks from localStorage/GitHub
4. **Check Duplicates:** Ensure employee hasn't already picked
5. **Add New Pick:** Append the entry to the array
6. **Save Everywhere:** 
   - Save to localStorage
   - Sync to GitHub (if configured)
7. **Update UI:** Show pick count in admin panel
8. **Prevent Re-use:** Mark QR token as used

**Data Flow:**
```
User Spins 
  ↓
attemptAssignment(selectedName)
  ↓
addLogEntry(giver, selectedName)
  ↓
loadPicksFromStorage() [Get all picks]
  ↓
Check if giver already picked
  ↓
If not: currentPicks.push(newEntry)
  ↓
savePicksToStorage(currentPicks) [Save to both places]
  ↓
✅ Pick is saved!
```
