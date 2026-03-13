/**
 * Run with: node database/seedUsers.js
 *
 * Creates sample student accounts and one owner account per establishment.
 * Passwords are hashed automatically via the User model pre-save hook.
 */

const mongoose = require('mongoose');
const User     = require('../src/models/users');

const MONGO_URI = 'mongodb://127.0.0.1:27017/myDatabase';

// Establishment ObjectIds from the existing seed
const EST_IDS = {
  prelude:      '69a95a4dabf2603b58236914',
  barn:         '69a95a4dabf2603b58236915',
  asterisko:    '69a95a4dabf2603b58236916',
  kuhmeal:      '69a95a4dabf2603b58236917',
  laElotes:     '69a95a4dabf2603b58236918',
  gangGang:     '69a95a4dabf2603b58236919',
  calleCafe:    '69a95a4dabf2603b5823691a',
  illo:         '69a95a4dabf2603b5823691b',
  angrydobo:    '69a95a4dabf2603b5823691c',
  dapitHapon:   '69a95a4dabf2603b5823691d'
};

const users = [
  // Students
  {
    username:    'jane_d',
    email:       'jane.d@dlsu.edu.ph',
    password:    'password123',
    description: 'DLSU student who loves trying new places around Taft.',
    role:        'student'
  },
  {
    username:    'marky',
    email:       'marky@dlsu.edu.ph',
    password:    'password123',
    description: 'Food explorer and coffee lover.',
    role:        'student'
  },
  {
    username:    'ella_s',
    email:       'ella.s@dlsu.edu.ph',
    password:    'password123',
    description: 'Always on the hunt for affordable eats near campus.',
    role:        'student'
  },
  {
    username:    'miggy',
    email:       'miggy@dlsu.edu.ph',
    password:    'password123',
    description: 'ITMGT senior. Reviews on the go.',
    role:        'student'
  },
  {
    username:    'kiks_m',
    email:       'kiks.m@dlsu.edu.ph',
    password:    'password123',
    description: 'Foodie and board game enthusiast.',
    role:        'student'
  },
  {
    username:    'sophia',
    email:       'sophia@dlsu.edu.ph',
    password:    'password123',
    description: 'Looking for the best drinks along Taft.',
    role:        'student'
  },
  {
    username:    'daniella',
    email:       'daniella@dlsu.edu.ph',
    password:    'password123',
    description: 'Aesthetic café hunter.',
    role:        'student'
  },

  // Establishment owners - credentials created manually, not via register
  {
    username:           'owner_prelude',
    email:              'owner@prelude.com',
    password:           'OwnerPrelude#1',
    description:        'Official Prelude account.',
    role:               'owner',
    ownedEstablishment: EST_IDS.prelude
  },
  {
    username:           'owner_barn',
    email:              'owner@barnbyborro.com',
    password:           'OwnerBarn#1',
    description:        'Official Barn by Borro account.',
    role:               'owner',
    ownedEstablishment: EST_IDS.barn
  },
  {
    username:           'owner_callecafe',
    email:              'owner@callecafe.com',
    password:           'OwnerCalle#1',
    description:        'Official Calle Cafe account.',
    role:               'owner',
    ownedEstablishment: EST_IDS.calleCafe
  },
  {
    username:           'owner_angrydobo',
    email:              'owner@angrydobo.com',
    password:           'OwnerAngry#1',
    description:        'Official Angrydobo account.',
    role:               'owner',
    ownedEstablishment: EST_IDS.angrydobo
  },
  {
    username:           'owner_laelotes',
    email:              'owner@laelotes.com',
    password:           'OwnerLaElotes#1',
    description:        'Official La Elotes account.',
    role:               'owner',
    ownedEstablishment: EST_IDS.laElotes
  }
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Drop existing users to avoid duplicate key errors on re-run
  await User.deleteMany({});
  console.log('Cleared existing users');

  for (const userData of users) {
    const user = new User(userData);
    await user.save(); // triggers the pre-save hook in users.js which hashes the password
    console.log(`Created user: ${user.username} (${user.role})`);
  }

  console.log('\n✅  All users seeded successfully.');
  console.log('\nSample login credentials:');
  console.log('  Student  → username: jane_d       / password: password123');
  console.log('  Student  → username: miggy         / password: password123');
  console.log('  Owner    → username: owner_prelude / password: OwnerPrelude#1');
  console.log('  Owner    → username: owner_barn    / password: OwnerBarn#1');

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });