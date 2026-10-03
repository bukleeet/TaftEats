// High-confidence, offline checks. Reports locations and categories, never credential values.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const patterns = [
  ['MongoDB credential URI', /mongodb(?:\+srv)?:\/\/[^\s/:<>]+:[^\s/@<>]+@/],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,})\b/],
  ['Private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['API credential', /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/],
];
const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
function scan(content, file, commit) {
  let found = false;
  for (const [category, pattern] of patterns) {
    if (pattern.test(content)) {
      console.log(JSON.stringify({ category, file, ...(commit ? { commit } : {}) }));
      found = true;
    }
  }
  return found;
}
const files = git('ls-files', '--cached', '--others', '--exclude-standard')
  .trim()
  .split('\n')
  .filter((f) => /\.(?:js|json|md|txt|ya?ml|env)$|(?:^|\/)\.env/.test(f));
let findings = 0;
if (process.argv.includes('--history')) {
  const commits = git('rev-list', '--all').trim().split('\n');
  for (const commit of commits) {
    const historical = git('ls-tree', '-r', '--name-only', commit)
      .trim()
      .split('\n')
      .filter((f) => /\.(?:js|json|txt|env)$|(?:^|\/)\.env/.test(f));
    for (const file of historical)
      if (scan(git('show', `${commit}:${file}`), file, commit)) findings++;
  }
} else {
  for (const file of files)
    if (fs.existsSync(file) && scan(fs.readFileSync(file, 'utf8'), file)) findings++;
}
console.log(
  JSON.stringify({
    event: 'secret_scan_complete',
    findings,
    scope: process.argv.includes('--history')
      ? 'all local git history'
      : 'non-ignored working files',
  }),
);
process.exitCode = findings ? 1 : 0;
