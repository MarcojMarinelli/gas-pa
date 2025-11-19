# GitHub Setup Guide for GAS-PA

## ✅ Git Configuration Complete

Your local git is configured with:
- **Email**: marcojmarinelli@gmail.com
- **Name**: MarcojMarinelli

---

## 🔐 GitHub Authentication (Required)

GitHub no longer accepts passwords. You need to create a **Personal Access Token (PAT)**.

### Step 1: Create a Personal Access Token

1. **Go to GitHub**: https://github.com/settings/tokens
2. **Click**: "Generate new token" → "Generate new token (classic)"
3. **Configure the token**:
   - **Note**: "GAS-PA Project"
   - **Expiration**: 90 days (or custom)
   - **Select scopes**:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)
     - ✅ `write:packages` (Upload packages)
     - ✅ `delete_repo` (Delete repositories - optional)

4. **Click**: "Generate token"
5. **COPY THE TOKEN** - You won't see it again!
   - It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2: Create GitHub Repository

1. **Go to**: https://github.com/new
2. **Repository name**: `gas-pa` (or your preferred name)
3. **Description**: "Google Apps Script Personal Assistant - Email automation & AI-powered management"
4. **Visibility**:
   - ✅ **Private** (recommended - contains sensitive code)
   - ⚠️ **Public** (only if you want to share publicly)
5. **Do NOT initialize** with README, .gitignore, or license (we already have these)
6. **Click**: "Create repository"

---

## 🚀 Connect Your Local Repository to GitHub

After creating the repository and PAT, run these commands:

```bash
# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/gas-pa.git

# Push your code to GitHub (you'll be prompted for credentials)
git push -u origin main
```

### When Prompted for Credentials:

- **Username**: `marcojmarinelli` (or your GitHub username)
- **Password**: Paste your **Personal Access Token** (NOT your GitHub password)

---

## 💾 Save Your Token Securely (Optional)

To avoid entering your token every time, you can cache it:

```bash
# Cache credentials for 1 hour
git config --global credential.helper cache

# Cache credentials for 24 hours
git config --global credential.helper 'cache --timeout=86400'

# Or store permanently (less secure but convenient)
git config --global credential.helper store
```

---

## 🔑 Alternative: SSH Keys (More Secure)

If you prefer SSH authentication:

### 1. Generate SSH Key

```bash
ssh-keygen -t ed25519 -C "marcojmarinelli@gmail.com"
# Press Enter to accept default location
# Enter a passphrase (or press Enter for no passphrase)
```

### 2. Copy Public Key

```bash
cat ~/.ssh/id_ed25519.pub
```

### 3. Add to GitHub

1. Go to: https://github.com/settings/ssh/new
2. **Title**: "GAS-PA Development"
3. **Key**: Paste the public key from step 2
4. **Click**: "Add SSH key"

### 4. Use SSH Remote URL

```bash
# If you already added HTTPS remote, change it to SSH:
git remote set-url origin git@github.com:YOUR_USERNAME/gas-pa.git

# Or add as new remote:
git remote add origin git@github.com:YOUR_USERNAME/gas-pa.git

# Push
git push -u origin main
```

---

## 📋 Quick Reference Commands

```bash
# View remote configuration
git remote -v

# Check connection to GitHub
git remote show origin

# View commit history
git log --oneline --graph --all

# Create and push a new branch
git checkout -b feature/ui-implementation
git push -u origin feature/ui-implementation

# Tag a release
git tag -a v2.0 -m "Phase 2 Complete: Queue System"
git push origin v2.0

# Pull latest changes
git pull origin main
```

---

## ✅ Verification Checklist

- [ ] Personal Access Token created
- [ ] GitHub repository created
- [ ] Remote repository connected (`git remote -v` shows GitHub URL)
- [ ] Code pushed to GitHub (`git push -u origin main`)
- [ ] Repository visible on GitHub.com

---

## 🔒 Security Best Practices

1. ✅ **Never commit** `.clasp.json` (already in .gitignore)
2. ✅ **Never commit** API keys or secrets
3. ✅ **Use Private repository** for sensitive projects
4. ✅ **Rotate tokens** every 90 days
5. ✅ **Use SSH keys** for better security
6. ✅ **Enable 2FA** on GitHub account

---

## 🆘 Troubleshooting

### "remote: Support for password authentication was removed"
- You're using password instead of PAT
- Solution: Use Personal Access Token as password

### "Permission denied (publickey)"
- SSH key not added to GitHub
- Solution: Follow SSH setup steps above

### "Repository not found"
- Wrong repository name or no access
- Solution: Verify repository URL and permissions

### "Failed to push some refs"
- Remote has changes you don't have locally
- Solution: `git pull origin main --rebase` then `git push`

---

## 📞 Need Help?

- GitHub Docs: https://docs.github.com
- Git Docs: https://git-scm.com/doc
- Token Help: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
