# Christmas Gift Name Picker - GitHub Integration

## Overview

This is an enhanced version of the Christmas Gift Picker wheel application with **GitHub integration** for cloud storage and backup of:
- **Employee List** (`employees.json`)
- **Gift Assignment Picks** (`picks.json`)

## Features

✅ **Dynamic Employee Management** - Add/remove employees from admin panel  
✅ **GitHub Sync** - Automatically save employee list and picks to GitHub  
✅ **QR Code Generation** - Create unique QR codes for each employee  
✅ **Cloud Backup** - All data backed up on GitHub  
✅ **Local Fallback** - Works offline with localStorage fallback  
✅ **One-time QR Use** - Each QR code can only be used once  

## Quick Start

### 1. Admin Login
- Open `index.htm` without QR parameters
- Login with: 
  - Username: `geovest`
  - Password: `geovestdec25`

### 2. Configure GitHub (Optional but Recommended)
See `GITHUB_SETUP.md` for detailed instructions on:
- Creating a GitHub repository
- Generating a Personal Access Token
- Configuring the application

### 3. Manage Employees
- Add employees one by one in the "Manage Employees" section
- Click "Delete" to remove employees
- All changes are saved locally and to GitHub (if configured)

### 4. Generate QR Codes
- Set the base URL (typically your website URL)
- Click "Generate Tokens"
- View/print the QR codes
- Distribute to employees

### 5. Employee Spins Wheel
- Employee scans QR code
- Wheel appears with their name
- Click SPIN to get their gift recipient
- Result is recorded automatically

## How It Works

### Without GitHub (Local Storage Only)
- Employee list stored in browser's localStorage
- Picks stored in browser's localStorage
- Data persists as long as browser cache isn't cleared
- Works completely offline

### With GitHub Integration
- Employee list synced to `employees.json` in GitHub repo
- Picks synced to `picks.json` in GitHub repo
- Automatic sync when data changes
- Manual sync available via "Sync to GitHub" button
- Falls back to localStorage if GitHub unavailable

## File Structure

```
index.htm              - Main application (admin + wheel pages)
script.js             - Application logic with GitHub integration
style.css             - Styling
admin.htm             - Legacy admin page (can be deleted)
picks.txt             - Placeholder for exports
GITHUB_SETUP.md       - GitHub setup instructions
README.md             - This file
```

## Admin Panel Features

### GitHub Configuration Section
- Store GitHub credentials securely in localStorage
- Test connection to verify credentials
- Manual sync button to push data to GitHub
- Status indicator shows connection state

### Employee Management Section
- Add new employees by name
- List all current employees
- Delete employees with confirmation
- Changes auto-save to storage

### QR Code Generation Section
- Set base URL for QR codes
- Generate new unique tokens for each employee
- Reuse existing tokens
- Print-friendly QR card layout
- Download employee list as CSV

## Data Format

### employees.json
```json
["Dipesh", "Safala", "Pramada", "Bikram", ...]
```

### picks.json
```json
[
  {
    "timeISO": "2025-12-15T14:30:00.000Z",
    "giver": "Dipesh",
    "receiver": "Safala"
  },
  ...
]
```

## Troubleshooting

### GitHub Integration Not Working
1. Check GitHub credentials in admin panel
2. Click "Test Connection" to verify
3. Ensure repository exists on GitHub
4. Verify token has `repo` scope
5. Check token hasn't expired

### Data Not Syncing
- Click "Sync to GitHub" button manually
- Check browser console (F12) for errors
- Verify GitHub configuration is saved

### Lost Data
- If GitHub not configured: localStorage fallback is available
- If localStorage cleared: data can be recovered from GitHub
- Always keep backups!

### QR Code Issues
- Ensure base URL is complete (with https://)
- Try regenerating tokens
- Clear browser cache and try again

## Security Considerations

⚠️ **GitHub Token Storage**
- Personal access token stored in browser localStorage
- Not transmitted to any server except GitHub
- Token visible in browser DevTools
- Anyone with browser access can see the token
- Tokens can be revoked from GitHub anytime

**Recommendations:**
- Use GitHub Private repository for sensitive data
- Create token with minimal required scope (`repo`)
- Regularly check and revoke old tokens
- Don't share the application URL publicly

## Limitations

- QR codes stored in localStorage only (not synced to GitHub)
- GitHub sync requires internet connection
- Browser localStorage is browser-specific (won't sync across devices)
- Maximum localStorage size: ~10MB per browser

## Advanced Usage

### Manual Data Export
- **Employee List**: Click "Download CSV" in admin panel
- **Picks Log**: Click "Download Log" in wheel panel

### Resetting Data
- Clear browser localStorage: DevTools → Application → Storage → Local Storage
- Create new GitHub tokens for re-configuration

### Scaling for Multiple Locations
- Create separate GitHub repositories per location
- Use different GitHub tokens in each location's instance
- Employees can scan from any instance sharing same repository

## Support & Troubleshooting

For GitHub integration issues, see `GITHUB_SETUP.md`

## License

Created for Geovisualization Engineering & Spatial Technologies Pvt. Ltd.
