# Quick Reference Guide

## Application Access

| User Type | URL | Credentials |
|-----------|-----|-------------|
| Admin | `index.htm` | User: `geovest`<br/>Pass: `geovestdec25` |
| Employee | `index.htm?code=<TOKEN>&employee=<NAME>` | Via QR Code |

## Admin Workflow

1. **Open Admin Panel**
   - Visit `index.htm`
   - Click Login
   - Enter credentials

2. **Add Employees**
   - Type employee name
   - Click "Add"
   - Employee appears in list

3. **Configure GitHub** (Optional)
   - Fill GitHub Token, Username, Repo
   - Click "Save GitHub Config"
   - Click "Test Connection"

4. **Generate QR Codes**
   - Click "Use current" for base URL
   - Click "Generate Tokens"
   - QR codes appear with URLs

5. **Print & Distribute**
   - Click "Print" to print cards
   - Cut and distribute to employees
   - Or click "Download CSV" for employee list

## Employee Workflow

1. **Scan QR Code**
   - Employee scans QR code from printed card
   - Wheel page loads automatically

2. **Spin the Wheel**
   - Click "SPIN" button
   - Wheel spins with name scrolling
   - Gift recipient revealed

3. **One-time Use**
   - Same QR cannot be used again
   - Each employee gets unique code

## Data Storage

| Data | Local Storage | GitHub |
|------|---------------|--------|
| Employee List | ✅ Yes | ✅ Optional |
| Picks Log | ✅ Yes | ✅ Optional |
| QR Tokens | ✅ Yes | ❌ No |
| GitHub Config | ✅ Yes | ❌ No |

## Default Credentials

```
User: geovest
Pass: geovestdec25
```

## GitHub Token Setup

1. Go to GitHub Settings → Developer Settings → Personal Access Tokens
2. Generate new token (classic)
3. Select "repo" scope
4. Copy token
5. Paste in admin panel

## Keyboard Shortcuts

- **In Employee Input**: Press Enter to add employee
- **In Admin Panel**: No special shortcuts

## Browser Console Errors (Ignore These)

- `GitHub not configured` - Normal if GitHub not set up
- `Failed to sync to GitHub` - Normal if GitHub unavailable
- `404 Not Found` - Normal for first-time GitHub setup

## Troubleshooting Checklist

- [ ] GitHub credentials correct?
- [ ] Token not expired?
- [ ] Repository exists?
- [ ] Token has "repo" scope?
- [ ] Base URL complete?
- [ ] Employees added to list?
- [ ] QR tokens generated?

## File Locations After Setup

In your GitHub repository:
- `employees.json` - Employee list
- `picks.json` - Gift assignments

## Export Options

- **Employees**: "Download CSV" button → `qr_tokens.csv`
- **Picks**: "Download Log" button → `picks.txt`

## Important Notes

⚠️ **GitHub Token Security**
- Token stored in browser localStorage
- Visible in browser DevTools
- Can be revoked anytime from GitHub

⚠️ **QR Codes**
- One-time use per code
- Base URL must be exact
- Employee name must match exactly

⚠️ **Data**
- Employee list is dynamic
- Picks cannot be undone
- Always backup important data

## Common Issues

**"Invalid QR code" error**
- Check employee name spelling
- Regenerate tokens
- Verify base URL

**GitHub sync failing**
- Test connection in admin panel
- Check token expiration
- Verify repository exists

**Employee added but not showing**
- Refresh page
- Check spelling
- Clear browser cache

## Contact Information

For support with GitHub integration, refer to `GITHUB_SETUP.md`
