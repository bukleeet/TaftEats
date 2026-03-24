/**
 * Run with: node database/seedUsers.js
 * Creates sample student and owner accounts.
 * Passwords are hashed via the User model pre-save hook.
 */

const mongoose = require('mongoose');
const User     = require('../src/models/users');

require('dotenv').config();
const MONGO_URI = process.env.MONGO_URI;

const EST_IDS = {
  prelude:    '69a95a4dabf2603b58236914',
  barn:       '69a95a4dabf2603b58236915',
  asterisko:  '69a95a4dabf2603b58236916',
  kuhmeal:    '69a95a4dabf2603b58236917',
  laElotes:   '69a95a4dabf2603b58236918',
  gangGang:   '69a95a4dabf2603b58236919',
  calleCafe:  '69a95a4dabf2603b5823691a',
  illo:       '69a95a4dabf2603b5823691b',
  angrydobo:  '69a95a4dabf2603b5823691c',
  dapitHapon: '69a95a4dabf2603b5823691d'
};

const users = [
  // Students
  { username: 'jane_d',    email: 'jane.d@dlsu.edu.ph',    password: 'password123', avatar: 'jane_d-Avatar.jpg',    description: 'DLSU student who loves trying new places around Taft.', role: 'student' },
  { username: 'marky',     email: 'marky@dlsu.edu.ph',      password: 'password123', avatar: 'miggy-Avatar.png',     description: 'Food explorer and coffee lover.', role: 'student' },
  { username: 'ella_s',    email: 'ella.s@dlsu.edu.ph',     password: 'password123', avatar: 'ella_s-Avatar.jpg',    description: 'Always on the hunt for affordable eats near campus.', role: 'student' },
  { username: 'miggy',     email: 'miggy@dlsu.edu.ph',      password: 'password123', avatar: 'miggy-Avatar.png',     description: 'ITMGT senior. Reviews on the go.', role: 'student' },
  { username: 'kiks_m',    email: 'kiks.m@dlsu.edu.ph',     password: 'password123', avatar: 'kiks_m-Avatar.jpg',    description: 'Foodie and board game enthusiast.', role: 'student' },
  { username: 'sophia',    email: 'sophia@dlsu.edu.ph',     password: 'password123', avatar: 'sophia-Avatar.png',    description: 'Looking for the best drinks along Taft.', role: 'student' },
  { username: 'daniella',  email: 'daniella@dlsu.edu.ph',   password: 'password123', avatar: 'daniella-Avatar.jpg',  description: 'Aesthetic café hunter.', role: 'student' },
  { username: 'carlos_r',  email: 'carlos.r@dlsu.edu.ph',   password: 'password123', avatar: 'defaultprofile.png',   description: 'CS student, fueled by coffee and deadlines.', role: 'student' },
  { username: 'bea_t',     email: 'bea.t@dlsu.edu.ph',      password: 'password123', avatar: 'defaultprofile.png',   description: 'Bio major who rates everything like a thesis.', role: 'student' },
  { username: 'lance_v',   email: 'lance.v@dlsu.edu.ph',    password: 'password123', avatar: 'defaultprofile.png',   description: 'Engineering student. Eats fast, reviews faster.', role: 'student' },
  { username: 'trisha_m',  email: 'trisha.m@dlsu.edu.ph',   password: 'password123', avatar: 'defaultprofile.png',   description: 'Comms student and aspiring food blogger.', role: 'student' },
  { username: 'pau_g',     email: 'pau.g@dlsu.edu.ph',      password: 'password123', avatar: 'defaultprofile.png',   description: 'Psychology major. Reads menus like personality tests.', role: 'student' },

  // Owners
  { username: 'owner_prelude',    email: 'owner@prelude.com',       password: 'OwnerPrelude#1',    description: 'Official Prelude account.',              role: 'owner', ownedEstablishment: EST_IDS.prelude },
  { username: 'owner_barn',       email: 'owner@barnbyborro.com',   password: 'OwnerBarn#1',       description: 'Official Barn by Borro account.',        role: 'owner', ownedEstablishment: EST_IDS.barn },
  { username: 'owner_callecafe',  email: 'owner@callecafe.com',     password: 'OwnerCalle#1',      description: 'Official Calle Cafe account.',           role: 'owner', ownedEstablishment: EST_IDS.calleCafe },
  { username: 'owner_angrydobo',  email: 'owner@angrydobo.com',     password: 'OwnerAngry#1',      description: 'Official Angrydobo account.',            role: 'owner', ownedEstablishment: EST_IDS.angrydobo },
  { username: 'owner_laelotes',   email: 'owner@laelotes.com',      password: 'OwnerLaElotes#1',   description: 'Official La Elotes account.',            role: 'owner', ownedEstablishment: EST_IDS.laElotes },
  { username: 'owner_asterisko',  email: 'owner@asterisko.com',     password: 'OwnerAsterisko#1',  description: 'Official Asterisko account.',            role: 'owner', ownedEstablishment: EST_IDS.asterisko },
  { username: 'owner_kuhmeal',    email: 'owner@kuhmeal.com',       password: 'OwnerKuhMeal#1',    description: 'Official KuhMeal account.',              role: 'owner', ownedEstablishment: EST_IDS.kuhmeal },
  { username: 'owner_ganggang',   email: 'owner@ganggangchicken.com', password: 'OwnerGangGang#1', description: 'Official Gang Gang Chicken account.',    role: 'owner', ownedEstablishment: EST_IDS.gangGang },
  { username: 'owner_illo',       email: 'owner@illo.com',          password: 'OwnerIllo#1',       description: 'Official Illo account.',                 role: 'owner', ownedEstablishment: EST_IDS.illo },
  { username: 'owner_dapithapon', email: 'owner@dapithapon.com',    password: 'OwnerDapit#1',      description: 'Official Dapit-Hapon Cafe account.',     role: 'owner', ownedEstablishment: EST_IDS.dapitHapon },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  await User.deleteMany({});
  console.log('Cleared existing users');

  for (const data of users) {
    const user = new User(data);
    await user.save();
    console.log(`Created: ${user.username} (${user.role})`);
  }

  console.log('\nAll users seeded.');
  console.log('Students  → password: password123');
  console.log('Owners    → see README for individual passwords');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });