// scripts/restore-env.js
// Restores .env.local from .env.backup
// Usage: node scripts/restore-env.js

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const backupPath = path.join(root, '.env.backup');
const localPath = path.join(root, '.env.local');

// Step 1: Check that the backup file exists.
if (!fs.existsSync(backupPath)) {
  console.error('.env.backup not found. Create the backup file before restoring.');
  process.exit(1);
}

// Step 2: Read the backup contents.
const data = fs.readFileSync(backupPath, { encoding: 'utf8' });

// Step 3: Write to .env.local. Overwrites any existing .env.local.
fs.writeFileSync(localPath, data, { encoding: 'utf8', mode: 0o600 });

console.log('.env.local restored from .env.backup');

// Notes:
// - .env.local and .env.backup are listed in .gitignore to prevent accidental commits.
// - Keep .env.backup secure; treat it like a secret.
