const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');

// Version URLs by their bytes so cached files cannot outlive a changed deployment.
module.exports = Object.fromEntries(
  Object.entries({
    stylesheet: '/css/style.css',
    javascript: '/js/app.js',
    hero: '/images/hero.webp',
  }).map(([name, url]) => {
    const bytes = readFileSync(path.join(__dirname, '..', 'public', url.slice(1)));
    const version = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    return [name, `${url}?v=${version}`];
  }),
);
