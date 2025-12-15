# Testing the QR Code and Rules Popup

## Quick Test URL

To test the QR code functionality without scanning, use this format:

```
file:///c:/Users/dipesh/OneDrive/Office/Christmas_Gift/new_updates/index.htm?code=TEST123&employee=Dipesh
```

Make sure to:
1. Replace `Dipesh` with an actual employee name from your system
2. Make sure the employee name matches exactly (case-sensitive!)

## Expected Behavior

1. Page loads
2. Rules popup should appear with "Welcome, [Employee Name]!" at the top
3. Employee name should be displayed in the rules header
4. Click "✨ I Understand - Let's Spin! ✨" button
5. Wheel should load and employee name should show at top
6. Spin button should be enabled

## Troubleshooting

### If rules don't show up:
1. Open browser DevTools (F12)
2. Go to Console tab
3. You should see these logs:
   - "initRulesPanel called"
   - "initRulesPanel - QR Parameters: {qrEmployee: "...", qrCode: "..."}"
   - "Current employees list: [...]"
   - "Modal shown"

If you don't see these logs, it means the function isn't being called.

### If you see "Employee not found" alert:
- The employee name in your URL doesn't match an employee in the system
- Example: URL has "Dipesh" but system has "dipesh" (case matters!)

### If rules show but wheel doesn't load:
- After clicking "Let's Spin!", check the console
- Should see logs about loading wheel
- Might see "Invalid or missing QR code" if there's still a validation issue

## Testing Employee Name Match

Run this in the console (F12):
```javascript
// Check what employees are in the system
JSON.parse(localStorage.getItem('employeesList') || '[]')
```

Then use one of those exact names (with exact case) in your test URL.
