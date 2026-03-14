// Run seedUsers.js first so the user ObjectIds exist.

// Establishments
db.establishments.deleteMany({});
db.establishments.insertMany([
  {
    _id: ObjectId('69a95a4dabf2603b58236914'),
    name: 'Prelude',
    rating: 3.5,
    description: 'A cozy café perfect for studying, known for its coffee and pastries.',
    image: 'prelude.jpg'
  },
  {
    _id: ObjectId('69a95a4dabf2603b58236915'),
    name: 'Barn by Borro',
    rating: 4.7,
    description: "LaSallian's favorite! Offers affordable meals with generous servings.",
    image: 'barn.jpeg'
  },
  {
    _id: ObjectId('69a95a4dabf2603b58236916'),
    name: 'Asterisko',
    rating: 3.9,
    description: 'Good hangout spot with friends. Offers board games and refreshing drinks.',
    image: 'asterisko.png'
  },
  {
    _id: ObjectId('69a95a4dabf2603b58236917'),
    name: 'KuhMeal',
    rating: 3.8,
    description: 'Chicken and Fries served with special sauce.',
    image: 'kuhmeal.png'
  },
  {
    _id: ObjectId('69a95a4dabf2603b58236918'),
    name: 'La Elotes',
    rating: 4.6,
    description: 'Known for comfort food and affordable meals.',
    image: 'laelotes.png'
  },
  {
    _id: ObjectId('69a95a4dabf2603b58236919'),
    name: 'Gang Gang Chicken',
    rating: 4.1,
    description: 'Small but cozy place perfect for quick meals.',
    image: 'ganggangchicken.png'
  },
  {
    _id: ObjectId('69a95a4dabf2603b5823691a'),
    name: 'Calle Cafe',
    rating: 4.8,
    description: 'Trendy hangout spot with aesthetic interiors.',
    image: 'callecafe.png'
  },
  {
    _id: ObjectId('69a95a4dabf2603b5823691b'),
    name: 'Illo',
    rating: 4,
    description: 'Budget-friendly meals for students on the go.',
    image: 'illo.jpeg'
  },
  {
    _id: ObjectId('69a95a4dabf2603b5823691c'),
    name: 'Angrydobo',
    rating: 4.4,
    description: 'A Filipino restaurant specializing in elevated, comfort-style adobo and classic dishes.',
    image: 'angrydobo.jpeg'
  },
  {
    _id: ObjectId('69a95a4dabf2603b5823691d'),
    name: 'Dapit-Hapon Cafe & Bistro',
    rating: 4.2,
    description: 'Chill café with drinks and light meals.',
    image: 'dapithapon.jpeg'
  }
]);

// Fetch user ObjectIds seeded by seedUsers.js
// user field is now an ObjectId ref, username is cached as a string for display
const jane    = db.users.findOne({ username: 'jane_d' })._id;
const marky   = db.users.findOne({ username: 'marky' })._id;
const ella    = db.users.findOne({ username: 'ella_s' })._id;
const miggy   = db.users.findOne({ username: 'miggy' })._id;
const kiks    = db.users.findOne({ username: 'kiks_m' })._id;
const sophia  = db.users.findOne({ username: 'sophia' })._id;
const daniella = db.users.findOne({ username: 'daniella' })._id;

db.reviews.deleteMany({});
db.reviews.insertMany([

  // Prelude
  {
    establishment: ObjectId('69a95a4dabf2603b58236914'),
    user: jane,
    username: 'jane_d',
    title: 'Perfect study spot',
    rating: 5,
    body: 'The atmosphere is calm and the coffee is amazing. WiFi is stable too!',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236914'),
    user: marky,
    username: 'marky',
    title: 'Good but crowded',
    rating: 4,
    body: 'Love the drinks, but it gets really full during afternoons.',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },

  // Barn by Borro
  {
    establishment: ObjectId('69a95a4dabf2603b58236915'),
    user: ella,
    username: 'ella_s',
    title: 'Affordable and tasty',
    rating: 5,
    body: 'Generous servings and super affordable. Perfect for lunch!',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236915'),
    user: miggy,
    username: 'miggy',
    title: 'Noisy at peak hours',
    rating: 4,
    body: 'Food is great but the place can be really noisy at peak hours.',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },

  // Asterisko
  {
    establishment: ObjectId('69a95a4dabf2603b58236916'),
    user: kiks,
    username: 'kiks_m',
    title: 'Fun hangout spot',
    rating: 5,
    body: 'Board games and drinks are amazing! Great place to chill with friends.',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236916'),
    user: sophia,
    username: 'sophia',
    title: 'Good drinks but limited seating',
    rating: 4,
    body: 'The drinks are refreshing but seating is a bit limited.',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },

  // KuhMeal
  {
    establishment: ObjectId('69a95a4dabf2603b58236917'),
    user: daniella,
    username: 'daniella',
    title: 'Tasty chicken',
    rating: 4,
    body: 'Chicken and fries are yummy, perfect for a quick snack!',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236917'),
    user: miggy,
    username: 'miggy',
    title: 'Fast service',
    rating: 5,
    body: 'Service is quick and friendly, definitely coming back.',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },

  // La Elotes
  {
    establishment: ObjectId('69a95a4dabf2603b58236918'),
    user: ella,
    username: 'ella_s',
    title: 'Comfort food heaven',
    rating: 5,
    body: 'Affordable and really tasty meals. Perfect for students.',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236918'),
    user: jane,
    username: 'jane_d',
    title: 'Loved the place',
    rating: 4,
    body: 'Cozy vibe and great food, though it gets crowded sometimes.',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },

  // Gang Gang Chicken
  {
    establishment: ObjectId('69a95a4dabf2603b58236919'),
    user: kiks,
    username: 'kiks_m',
    title: 'Good quick meals',
    rating: 4,
    body: 'Perfect for a quick bite, loved the chicken.',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236919'),
    user: sophia,
    username: 'sophia',
    title: 'Nice spot',
    rating: 4,
    body: 'Small but cozy. Staff are friendly too!',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },

  // Calle Cafe
  {
    establishment: ObjectId('69a95a4dabf2603b5823691a'),
    user: daniella,
    username: 'daniella',
    title: 'Aesthetic spot',
    rating: 5,
    body: 'Great interiors, perfect for photos. Drinks are amazing.',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },
  {
    establishment: ObjectId('69a95a4dabf2603b5823691a'),
    user: miggy,
    username: 'miggy',
    title: 'Trendy but pricey',
    rating: 4,
    body: 'Love the vibe, but meals are a bit expensive for students.',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },

  // Illo
  {
    establishment: ObjectId('69a95a4dabf2603b5823691b'),
    user: ella,
    username: 'ella_s',
    title: 'Budget-friendly',
    rating: 4,
    body: 'Good food at a reasonable price. Quick service too.',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },
  {
    establishment: ObjectId('69a95a4dabf2603b5823691b'),
    user: jane,
    username: 'jane_d',
    title: 'Great for students',
    rating: 4,
    body: 'Easy to grab meals before class. Tasty sandwiches!',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },

  // Angrydobo
  {
    establishment: ObjectId('69a95a4dabf2603b5823691c'),
    user: kiks,
    username: 'kiks_m',
    title: 'Delicious adobo',
    rating: 5,
    body: 'Classic Filipino dishes done right. Highly recommended!',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },
  {
    establishment: ObjectId('69a95a4dabf2603b5823691c'),
    user: sophia,
    username: 'sophia',
    title: 'Cozy vibes',
    rating: 4,
    body: 'Loved the adobo, place is small but comfy.',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },

  // Dapit-Hapon Cafe & Bistro
  {
    establishment: ObjectId('69a95a4dabf2603b5823691d'),
    user: daniella,
    username: 'daniella',
    title: 'Chill café',
    rating: 4,
    body: 'Perfect place to relax with friends. Drinks are great.',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  },
  {
    establishment: ObjectId('69a95a4dabf2603b5823691d'),
    user: miggy,
    username: 'miggy',
    title: 'Nice menu',
    rating: 5,
    body: 'Lots of options and very tasty meals.',
    helpfulVotes: [],
    unhelpfulVotes: [],
    media: null,
    edited: false,
    ownerResponse: null
  }

]);