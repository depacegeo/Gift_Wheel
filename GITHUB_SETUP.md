# GitHub Integration Setup Guide

This application can save employee lists and picks to a GitHub repository for backup and cloud synchronization.

## Setup Instructions

### Step 1: Create a GitHub Repository

1. Go to [GitHub](https://github.com) and log in
2. Click the **+** icon in the top right → **New repository**
3. Repository name: `christmas-gift-picker` (or your preferred name)
4. Description: "Employee gift assignment storage"
5. Choose **Public** or **Private** (Private recommended)
6. Click **Create repository**

### Step 2: Generate a Personal Access Token

1. Go to GitHub Settings → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token** → **Generate new token (classic)**
3. Token name: `christmas-gift-picker`
4. Scopes: Check **`repo`** (for full repository access)
5. Expiration: Choose an appropriate duration
6. Click **Generate token**
7. **Copy the token immediately** (you won't see it again!)

### Step 3: Configure the Application

1. Open the Christmas Gift Picker web application
2. Click **Admin Login**
3. Login with credentials:
   - User: `geovest`
   - Password: `geovestdec25`
4. Scroll to **GitHub Configuration** section
5. Fill in the fields:
   - **GitHub Token**: Paste the token from Step 2
   - **GitHub Username**: Your GitHub username
   - **Repository Name**: `christmas-gift-picker` (or the name you chose)
6. Click **Save GitHub Config**
7. Click **Test Connection** to verify everything works

### Step 4: Sync Data

Once configured, data will automatically sync to GitHub whenever:
- An employee is added or removed
- A pick is recorded after spinning the wheel
- You click **Sync to GitHub** manually

You can also click **Sync to GitHub** anytime to force a manual sync.

## Data Files on GitHub

The application will create two files in your repository:

- **`employees.json`** - Contains the list of employees
- **`picks.json`** - Contains the gift assignment picks with timestamps

## Fallback to Local Storage

If GitHub is not configured or connection fails:
- The application falls back to **localStorage** automatically
- Data remains available locally in the browser
- You can configure GitHub anytime to start cloud syncing

## Troubleshooting

### "Test Connection failed" error
- Verify your GitHub username is correct (case-sensitive)
- Verify the repository name is correct
- Check the token has not expired
- Ensure the token has `repo` scope
- Repository must exist on GitHub

### Token keeps resetting
- Browser localStorage may be cleared
- Save your GitHub config again
- Consider storing credentials securely

### Manual Data Export
- Use the **Download CSV** button to export employee list
- Use the **Download Log** button to export picks

## Security Notes

- Personal access tokens are stored in browser's localStorage
- Keep your token private - never commit it to Git
- Use a GitHub Private repository for sensitive data
- Tokens can be revoked from GitHub settings anytime

## Updating Token or Credentials

1. Go back to Admin Panel
2. Update the GitHub Configuration fields
3. Click **Save GitHub Config**
4. Click **Test Connection** to verify
