# Database recovery

`npm run backup` creates encrypted logical snapshots and restores them into an unused recovery database. It never overwrites an application database. The commands use the existing MongoDB driver and require a replica set.

## Create and inspect a backup

Choose a long, independent backup passphrase and save it in your password manager. Do not reuse the database password or session secret. The passphrase must contain at least 20 characters. Keep it separate from off-device backup copies; losing it makes the backup unrecoverable.

In PowerShell, read the passphrase without putting it in command history:

```powershell
$backupPassphraseSecret = Read-Host 'Backup passphrase' -AsSecureString
try {
  $env:BACKUP_PASSPHRASE = [System.Net.NetworkCredential]::new('', $backupPassphraseSecret).Password
  npm run backup -- create before-change.backup.json
  npm run backup -- inspect before-change.backup.json
} finally {
  Remove-Item Env:BACKUP_PASSPHRASE -ErrorAction SilentlyContinue
  $backupPassphraseSecret.Dispose()
}
```

`create` reads `MONGO_URI` from the local environment or `.env`. Omitting the filename produces a timestamped name. Files stay in ignored `.cache/backups/`; existing filenames are refused. Inspection prints only the source database, creation time, collection names, and counts. Neither command prints credentials or documents.

Each snapshot uses AES-256-GCM authenticated encryption, a fresh salt and nonce, and a scrypt-derived key. The writer decrypts and compares its output before reporting success. Documents are read in one snapshot transaction, retaining ObjectIds, dates, binary data, decimal values, and large integers. Index definitions are included. Sessions and rate-limit buckets are excluded so recovery does not reactivate old sessions or stale limits.

This helper supports ordinary collections and snapshots up to 64 MiB of serialized data. It refuses views and collections with special options. Keep collection/index definitions unchanged during a backup. Larger databases, special collection configurations, and point-in-time recovery require provider backups or MongoDB Database Tools. Cloudinary assets are external to this snapshot and need their own retention policy.

## Restore drill

Create an unused database named `tafteats_restore_<unique_suffix>` and grant your recovery operator read/write access only to that database. Do not point either deployed app at it during a drill. Supply its complete connection string through a protected prompt, never as a command-line argument:

```powershell
$backupPassphraseSecret = Read-Host 'Backup passphrase' -AsSecureString
$restoreConnectionSecret = Read-Host 'Unused recovery database URI' -AsSecureString
try {
  $env:BACKUP_PASSPHRASE = [System.Net.NetworkCredential]::new('', $backupPassphraseSecret).Password
  $env:RESTORE_MONGO_URI = [System.Net.NetworkCredential]::new('', $restoreConnectionSecret).Password
  npm run backup -- restore before-change.backup.json
} finally {
  Remove-Item Env:BACKUP_PASSPHRASE, Env:RESTORE_MONGO_URI -ErrorAction SilentlyContinue
  $backupPassphraseSecret.Dispose()
  $restoreConnectionSecret.Dispose()
}
```

Restore authenticates the entire encrypted file before connecting to MongoDB. It rejects occupied destinations, names outside the recovery prefix, and the source database itself. After creating collections and indexes, it inserts and compares every document in a single transaction. Failed inserts roll back all restored documents; empty collection/index metadata can remain after failure. Use a fresh unused destination for another attempt.

After a successful drill, run migration preflight and application tests against the recovery database, verify sign-in and representative review/media pages, and record the recovery time. A production recovery additionally requires stopping writes, preserving a fresh snapshot of the current database, verifying the restored state, switching the deployment connection, and rebuilding. Do not restore onto a running application database.

## Retention and scheduling

This portfolio deployment uses manual encrypted snapshots stored on the operator's PC. Take a backup before migrations and substantial data changes, preserve earlier snapshots, and rehearse recovery periodically. Off-device copies and a recurring job are not configured. Local-only storage cannot recover from loss of the PC; keep the encryption passphrase available separately from the backup files. The repository does not delete old backups automatically, and the Atlas free cluster currently has no managed backups.

Private plaintext release snapshots from earlier maintenance are recovery material too. Keep them private until their retention period ends. Do not publish them, the local recovery keys, or the ignored Git recovery bundles.
