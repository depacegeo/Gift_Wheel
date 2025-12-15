# Debugging Guide for Secret Santa Gift Picker

## Issue 1: QR Codes Not Working

### Steps to Diagnose:

1. **Generate QR Codes**
   - Go to Admin Panel
   - Add employees (e.g., "Dipesh", "Safala", "Pramada")
   - Enter base URL (e.g., `http://localhost:8000/index.htm` or your actual URL)
   - Click "Generate Tokens"
   - QR codes should appear with URLs like: `http://localhost:8000/index.htm?code=abc123&employee=Dipesh`

2. **Check Browser Console (F12)**
   - Open Developer Tools → Console tab
   - Look for these log messages:
     - "initRulesPanel - QR Parameters:" should show `{ qrEmployee: "Name", qrCode: "token123" }`
     - "Current employees list:" should show all employees

3. **Check Employee Name Matching**
   - The employee name in the QR URL must EXACTLY match an employee in the system
   - Check for spelling, capitalization, and spaces
   - If error appears: "Employee not found in the system", the name doesn't match

4. **Test Steps**
   - Use the generated QR code URL directly in the browser
   - Example: `http://yoursite.com/index.htm?code=abc123&employee=Dipesh`
   - If this works, the QR code generation is correct
   - If not, check the console logs

---

## Issue 2: Picks Not Being Saved/Downloaded

### Steps to Diagnose:

1. **Check Console Logs During Spin**
   - Open Developer Tools → Console tab
   - Spin the wheel
   - Look for these log messages:
     - "addLogEntry called with:" should show `{ giver: "EmployeeName", receiver: "OtherName" }`
     - "Current picks before adding:" should show existing picks
     - "New pick added, total picks now:" should show updated list
     - "Picks saved to localStorage:" should show the data

2. **Check LocalStorage**
   - In Console tab, run: `localStorage.getItem('pickLogs')`
   - Should return JSON like: `[{"timeISO":"2025-12-15T...","giver":"Dipesh","receiver":"Safala"}]`
   - If it returns `null`, picks aren't being saved

3. **Check Admin Panel**
   - Login to admin panel
   - Click "Refresh from Storage" button
   - Picks should appear in the "Gift Picks Log" section
   - If using auto-refresh, picks should update every 3 seconds

4. **Download Test**
   - Click "Download Picks" button
   - Check console for any error messages
   - A `picks.txt` file should be downloaded

---

## Common Issues and Solutions

### Issue: "Invalid or missing QR code" error
- **Cause**: Employee name in QR doesn't match the exact name in the system
- **Fix**: Re-generate tokens after ensuring employee names are correct
- **Check**: Case-sensitive! "dipesh" ≠ "Dipesh"

### Issue: Picks show in admin panel but won't download
- **Cause**: Download function may not be working properly
- **Fix**: Check console for JavaScript errors
- **Check**: Run in console: `localStorage.getItem('pickLogs')` to verify data exists

### Issue: Picks appear in one browser but not another
- **Cause**: Each browser has its own localStorage
- **Fix**: If using GitHub sync, configure it properly
- **Check**: Go to admin panel → GitHub Configuration → Save and Test Connection

### Issue: QR code appears but doesn't work when scanned
- **Cause**: URL in QR may be wrong or employee name is encoded incorrectly
- **Fix**: Click on the URL text below QR to see the full URL
- **Check**: The URL should contain both `code=` and `employee=` parameters

---

## Testing Workflow

### Full Test:
1. Open in one browser window → Admin Login
2. Add 3-5 employees
3. Generate QR codes with correct base URL
4. Open another browser tab/window
5. Scan or copy/paste a QR URL
6. Go through rules → Spin wheel
7. Check console logs for success messages
8. Go back to admin panel
9. Check if pick appears in "Gift Picks Log"
10. Click "Download Picks" to download

---

## Console Commands

Run these in Developer Tools Console (F12) to debug:

```javascript
// Check all stored picks
JSON.parse(localStorage.getItem('pickLogs') || '[]')

// Check employees list
localStorage.getItem('employeesList')

// Check QR tokens
JSON.parse(localStorage.getItem('qrTokens') || '{}')

// Check if GitHub is configured
JSON.parse(localStorage.getItem('githubConfig') || '{}')

// Force save a test pick
localStorage.setItem('pickLogs', JSON.stringify([
  { timeISO: new Date().toISOString(), giver: 'TestUser', receiver: 'TestReceiver' }
]))

// Clear all picks (if needed for testing)
localStorage.removeItem('pickLogs')
```

---

## If Issues Persist

### Check These Files:
1. Open `script.js` and search for `addLogEntry` - verify the function has `console.log` statements
2. Open `script.js` and search for `loadPicksFromStorage` - verify console logs are present
3. Open browser console (F12) and provide all error messages

### Provide to Support:
1. Browser Console output (all logs and errors)
2. LocalStorage contents (from console commands above)
3. Steps taken to reproduce the issue
4. Expected vs actual behavior
