// Run seedUsers.js first. Paste this into the Compass shell with myDatabase selected.

db.establishments.deleteMany({});
db.establishments.insertMany([
  { _id: ObjectId('69a95a4dabf2603b58236914'), name: 'Prelude',                   rating: 3.5, description: 'A cozy café perfect for studying, known for its coffee and pastries.',                             image: 'prelude.jpg' },
  { _id: ObjectId('69a95a4dabf2603b58236915'), name: 'Barn by Borro',             rating: 4.7, description: "LaSallian's favorite! Offers affordable meals with generous servings.",                            image: 'barn.jpeg' },
  { _id: ObjectId('69a95a4dabf2603b58236916'), name: 'Asterisko',                 rating: 3.9, description: 'Good hangout spot with friends. Offers board games and refreshing drinks.',                       image: 'asterisko.png' },
  { _id: ObjectId('69a95a4dabf2603b58236917'), name: 'KuhMeal',                   rating: 3.8, description: 'Chicken and Fries served with special sauce.',                                                    image: 'kuhmeal.png' },
  { _id: ObjectId('69a95a4dabf2603b58236918'), name: 'La Elotes',                 rating: 4.6, description: 'Known for comfort food and affordable meals.',                                                     image: 'laelotes.png' },
  { _id: ObjectId('69a95a4dabf2603b58236919'), name: 'Gang Gang Chicken',         rating: 4.1, description: 'Small but cozy place perfect for quick meals.',                                                    image: 'ganggangchicken.png' },
  { _id: ObjectId('69a95a4dabf2603b5823691a'), name: 'Calle Cafe',                rating: 4.8, description: 'Trendy hangout spot with aesthetic interiors.',                                                    image: 'callecafe.png' },
  { _id: ObjectId('69a95a4dabf2603b5823691b'), name: 'Illo',                      rating: 4.0, description: 'Budget-friendly meals for students on the go.',                                                   image: 'illo.jpeg' },
  { _id: ObjectId('69a95a4dabf2603b5823691c'), name: 'Angrydobo',                 rating: 4.4, description: 'A Filipino restaurant specializing in elevated, comfort-style adobo and classic dishes.',         image: 'angrydobo.jpeg' },
  { _id: ObjectId('69a95a4dabf2603b5823691d'), name: 'Dapit-Hapon Cafe & Bistro', rating: 4.2, description: 'Chill café with drinks and light meals.',                                                         image: 'dapithapon.jpeg' }
]);

// Fetch all user IDs
const jane     = db.users.findOne({ username: 'jane_d' })._id;
const marky    = db.users.findOne({ username: 'marky' })._id;
const ella     = db.users.findOne({ username: 'ella_s' })._id;
const miggy    = db.users.findOne({ username: 'miggy' })._id;
const kiks     = db.users.findOne({ username: 'kiks_m' })._id;
const sophia   = db.users.findOne({ username: 'sophia' })._id;
const daniella = db.users.findOne({ username: 'daniella' })._id;
const carlos   = db.users.findOne({ username: 'carlos_r' })._id;
const bea      = db.users.findOne({ username: 'bea_t' })._id;
const lance    = db.users.findOne({ username: 'lance_v' })._id;
const trisha   = db.users.findOne({ username: 'trisha_m' })._id;
const pau         = db.users.findOne({ username: 'pau_g' })._id;
const ownAsterisko  = db.users.findOne({ username: 'owner_asterisko' })._id;
const ownKuhmeal    = db.users.findOne({ username: 'owner_kuhmeal' })._id;
const ownGangGang   = db.users.findOne({ username: 'owner_ganggang' })._id;
const ownIllo       = db.users.findOne({ username: 'owner_illo' })._id;
const ownDapit      = db.users.findOne({ username: 'owner_dapithapon' })._id;

db.reviews.deleteMany({});
db.reviews.insertMany([

  // Prelude
  {
    establishment: ObjectId('69a95a4dabf2603b58236914'),
    user: jane, username: 'jane_d',
    title: 'Perfect study spot',
    rating: 5,
    body: 'The atmosphere is calm and the coffee is amazing. WiFi is stable too!',
    helpfulVotes: [miggy, carlos, bea, lance], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Thank you so much, Jane! We work hard to keep the vibe study-friendly. See you next time! ☕', author: 'owner', role: 'owner', createdAt: new Date('2025-01-17T10:00:00') }],
    createdAt: new Date('2025-01-15T09:30:00'), updatedAt: new Date('2025-01-15T09:30:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236914'),
    user: marky, username: 'marky',
    title: 'Good but crowded',
    rating: 3.5,
    body: 'Love the drinks, but it gets really full during afternoons. Hard to find a seat after 1pm.',
    helpfulVotes: [sophia, trisha], unhelpfulVotes: [daniella],
    media: [], edited: false,
    responseThread: [{ body: 'Thanks for the feedback, Marky! We know afternoons get busy — try coming in before 12 or after 3pm for a quieter experience ☕', author: 'owner', role: 'owner', createdAt: new Date('2025-02-05T09:00:00') }],
    createdAt: new Date('2025-02-03T14:15:00'), updatedAt: new Date('2025-02-03T14:15:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236914'),
    user: sophia, username: 'sophia',
    title: 'Nice drinks, slow service',
    rating: 3,
    body: 'The matcha latte is great but I waited almost 20 minutes during peak hours.',
    helpfulVotes: [pau, lance], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Hi Sophia, we apologize for the wait! We are working on speeding up service during busy hours. Thanks for the feedback.', author: 'owner', role: 'owner', createdAt: new Date('2025-03-22T09:00:00') }],
    createdAt: new Date('2025-03-20T11:00:00'), updatedAt: new Date('2025-03-20T11:00:00')
  },

  // Barn by Borro
  {
    establishment: ObjectId('69a95a4dabf2603b58236915'),
    user: ella, username: 'ella_s',
    title: 'Affordable and tasty',
    rating: 5,
    body: 'Generous servings and super affordable. Perfect for lunch between classes!',
    helpfulVotes: [jane, miggy, kiks, carlos, trisha, pau], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Thank you, Ella! Keeping meals affordable for students is our mission. Come back anytime! 🍱', author: 'owner', role: 'owner', createdAt: new Date('2025-01-24T08:30:00') }],
    createdAt: new Date('2025-01-22T12:00:00'), updatedAt: new Date('2025-01-22T12:00:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236915'),
    user: miggy, username: 'miggy',
    title: 'Noisy at peak hours',
    rating: 3.5,
    body: 'Food is great but the place can be really noisy at peak hours. Bring earphones.',
    helpfulVotes: [bea, lance], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: "Haha we know peak hours can get loud! We're exploring ways to expand our space. Thanks for sticking with us, Miggy!", author: 'owner', role: 'owner', createdAt: new Date('2025-02-12T09:00:00') }],
    createdAt: new Date('2025-02-10T13:45:00'), updatedAt: new Date('2025-02-10T13:45:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236915'),
    user: daniella, username: 'daniella',
    title: 'My go-to lunch spot',
    rating: 4.5,
    body: 'Consistently good food and the rice meals are filling. Staff is friendly too.',
    helpfulVotes: [sophia, trisha, pau], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Always happy to see you, Daniella! Our staff appreciates the kind words. See you again soon! 🍱', author: 'owner', role: 'owner', createdAt: new Date('2025-04-07T08:00:00') }],
    createdAt: new Date('2025-04-05T12:30:00'), updatedAt: new Date('2025-04-05T12:30:00')
  },

  // Asterisko
  {
    establishment: ObjectId('69a95a4dabf2603b58236916'),
    user: kiks, username: 'kiks_m',
    title: 'Fun hangout spot',
    rating: 5,
    body: 'Board games and drinks are amazing! Great place to chill with friends after class.',
    helpfulVotes: [jane, ella, carlos, bea, lance], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Org bondings are our specialty! Thanks for bringing the squad, Kiks. Come back for game night every Friday 🎲', author: 'owner', role: 'owner', createdAt: new Date('2025-01-30T10:00:00') }],
    createdAt: new Date('2025-01-28T17:00:00'), updatedAt: new Date('2025-01-28T17:00:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236916'),
    user: sophia, username: 'sophia',
    title: 'Good drinks but limited seating',
    rating: 3.5,
    body: 'The drinks are refreshing but seating is a bit limited. Best to come early.',
    helpfulVotes: [miggy, trisha], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Hi Sophia! We are working on expanding seating — stay tuned for updates. In the meantime, weekday mornings are usually less crowded! 🕹️', author: 'owner', role: 'owner', createdAt: new Date('2025-03-03T09:00:00') }],
    createdAt: new Date('2025-03-01T16:30:00'), updatedAt: new Date('2025-03-01T16:30:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236916'),
    user: jane, username: 'jane_d',
    title: 'Great for org bondings',
    rating: 4,
    body: 'Brought my org here and everyone had a great time. The board game selection is solid.',
    helpfulVotes: [daniella, pau], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'So glad the board game selection hit! We keep adding new titles every month. Which game was the favorite? 😄', author: 'owner', role: 'owner', createdAt: new Date('2025-04-14T09:00:00') }],
    createdAt: new Date('2025-04-12T18:00:00'), updatedAt: new Date('2025-04-12T18:00:00')
  },

  // KuhMeal
  {
    establishment: ObjectId('69a95a4dabf2603b58236917'),
    user: daniella, username: 'daniella',
    title: 'Tasty chicken',
    rating: 4,
    body: 'Chicken and fries are yummy, perfect for a quick snack between classes!',
    helpfulVotes: [lance, pau], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Thank you Daniella! The special sauce is our secret weapon 😄 Hope to see you again soon!', author: 'owner', role: 'owner', createdAt: new Date('2025-02-16T10:00:00') }],
    createdAt: new Date('2025-02-14T15:00:00'), updatedAt: new Date('2025-02-14T15:00:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236917'),
    user: miggy, username: 'miggy',
    title: 'Fast service',
    rating: 4.5,
    body: 'Service is quick and friendly, definitely coming back. The sauce is addictive.',
    helpfulVotes: [jane, kiks, carlos], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Speed is our promise! Thanks for noticing, Miggy. Our team works hard to keep wait times short 💪', author: 'owner', role: 'owner', createdAt: new Date('2025-03-10T10:00:00') }],
    createdAt: new Date('2025-03-08T14:00:00'), updatedAt: new Date('2025-03-08T14:00:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236917'),
    user: marky, username: 'marky',
    title: 'Decent but nothing special',
    rating: 3,
    body: 'It is what it is. Fills you up for a reasonable price. Not something I would go out of my way for.',
    helpfulVotes: [trisha], unhelpfulVotes: [ella],
    media: [], edited: false,
    responseThread: [{ body: 'Fair enough, Marky! We hope you give us another shot — we have some new items coming to the menu soon that might change your mind 😊', author: 'owner', role: 'owner', createdAt: new Date('2025-04-20T09:00:00') }],
    createdAt: new Date('2025-04-18T13:00:00'), updatedAt: new Date('2025-04-18T13:00:00')
  },

  // La Elotes
  {
    establishment: ObjectId('69a95a4dabf2603b58236918'),
    user: ella, username: 'ella_s',
    title: 'Comfort food heaven',
    rating: 5,
    body: 'Affordable and really tasty meals. Perfect for students on a budget.',
    helpfulVotes: [jane, marky, miggy, daniella, carlos, bea], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Means the world to us, Ella! Comfort food for students is exactly what we are about. 💚', author: 'owner', role: 'owner', createdAt: new Date('2025-01-12T11:00:00') }],
    createdAt: new Date('2025-01-10T12:00:00'), updatedAt: new Date('2025-01-10T12:00:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236918'),
    user: jane, username: 'jane_d',
    title: 'Loved the place',
    rating: 4,
    body: 'Cozy vibe and great food, though it gets crowded sometimes.',
    helpfulVotes: [sophia, pau], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Thank you Jane! The crowd is a sign that people love us 😄 We are working on adding more seating. Come early to grab a good spot!', author: 'owner', role: 'owner', createdAt: new Date('2025-02-22T09:00:00') }],
    createdAt: new Date('2025-02-20T11:30:00'), updatedAt: new Date('2025-02-20T11:30:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236918'),
    user: kiks, username: 'kiks_m',
    title: 'Hidden gem near campus',
    rating: 4.5,
    body: 'Not many people know about this place but the food is consistently good. Elotes are a must.',
    helpfulVotes: [lance, trisha, carlos], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Thanks for spreading the word, Kiks! The elotes are our pride. Hope to see you again soon! 🌽', author: 'owner', role: 'owner', createdAt: new Date('2025-03-17T10:00:00') }],
    createdAt: new Date('2025-03-15T12:45:00'), updatedAt: new Date('2025-03-15T12:45:00')
  },

  // Gang Gang Chicken
  {
    establishment: ObjectId('69a95a4dabf2603b58236919'),
    user: kiks, username: 'kiks_m',
    title: 'Good quick meals',
    rating: 4,
    body: 'Perfect for a quick bite, loved the chicken.',
    helpfulVotes: [bea, pau], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Thanks Kiks! Quick and delicious — that is exactly what we are going for. See you next time! 🍗', author: 'owner', role: 'owner', createdAt: new Date('2025-02-01T10:00:00') }],
    createdAt: new Date('2025-01-30T13:00:00'), updatedAt: new Date('2025-01-30T13:00:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236919'),
    user: sophia, username: 'sophia',
    title: 'Nice spot',
    rating: 3.5,
    body: 'Small but cozy. Staff are friendly too! Wish they had more seating.',
    helpfulVotes: [marky, lance], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Hi Sophia! We appreciate the kind words about our staff ❤️ More seating is in our plans — watch this space!', author: 'owner', role: 'owner', createdAt: new Date('2025-02-27T09:00:00') }],
    createdAt: new Date('2025-02-25T14:30:00'), updatedAt: new Date('2025-02-25T14:30:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b58236919'),
    user: ella, username: 'ella_s',
    title: 'Great for a quick lunch',
    rating: 4.5,
    body: 'Always come here when I need something fast. Never disappointed.',
    helpfulVotes: [jane, miggy, trisha], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Never disappointed is all we ask for, Ella! Come back anytime and bring friends 🐔', author: 'owner', role: 'owner', createdAt: new Date('2025-04-04T09:00:00') }],
    createdAt: new Date('2025-04-02T12:15:00'), updatedAt: new Date('2025-04-02T12:15:00')
  },

  // Calle Cafe
  {
    establishment: ObjectId('69a95a4dabf2603b5823691a'),
    user: daniella, username: 'daniella',
    title: 'Aesthetic spot',
    rating: 5,
    body: 'Great interiors, perfect for photos. Drinks are amazing and the playlist is good.',
    helpfulVotes: [jane, kiks, sophia, carlos, bea, pau], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Thank you so much Daniella! We put a lot of love into the atmosphere here. Tag us in your photos! 📸', author: 'owner', role: 'owner', createdAt: new Date('2025-01-07T11:00:00') }],
    createdAt: new Date('2025-01-05T16:00:00'), updatedAt: new Date('2025-01-05T16:00:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b5823691a'),
    user: miggy, username: 'miggy',
    title: 'Trendy but pricey',
    rating: 3.5,
    body: 'Love the vibe, but meals are a bit expensive for students. Worth it for special occasions.',
    helpfulVotes: [marky, trisha, lance], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'We hear you, Miggy! We do have student-friendly options on the menu — ask our staff about our value picks next time. 🙏', author: 'owner', role: 'owner', createdAt: new Date('2025-02-20T09:30:00') }],
    createdAt: new Date('2025-02-18T15:30:00'), updatedAt: new Date('2025-02-18T15:30:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b5823691a'),
    user: jane, username: 'jane_d',
    title: 'Best coffee on Taft',
    rating: 5,
    body: 'The cold brew here is unmatched. I come here every Friday as a treat to myself.',
    helpfulVotes: [ella, daniella, pau, bea], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Friday treat well deserved, Jane! The cold brew is brewed fresh daily just for regulars like you ☕ See you this Friday!', author: 'owner', role: 'owner', createdAt: new Date('2025-03-30T09:00:00') }],
    createdAt: new Date('2025-03-28T10:00:00'), updatedAt: new Date('2025-03-28T10:00:00')
  },

  // Illo
  {
    establishment: ObjectId('69a95a4dabf2603b5823691b'),
    user: ella, username: 'ella_s',
    title: 'Budget-friendly',
    rating: 4,
    body: 'Good food at a reasonable price. Quick service too.',
    helpfulVotes: [carlos, lance], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Thank you, Ella! Budget-friendly is our commitment. Come back anytime! 🙏', author: 'owner', role: 'owner', createdAt: new Date('2025-01-20T10:00:00') }],
    createdAt: new Date('2025-01-18T12:00:00'), updatedAt: new Date('2025-01-18T12:00:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b5823691b'),
    user: jane, username: 'jane_d',
    title: 'Great for students',
    rating: 4,
    body: 'Easy to grab meals before class. Tasty sandwiches!',
    helpfulVotes: [trisha, pau], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Sandwiches before class — the perfect fuel! Thanks for the love, Jane 😊', author: 'owner', role: 'owner', createdAt: new Date('2025-03-02T09:00:00') }],
    createdAt: new Date('2025-02-28T11:00:00'), updatedAt: new Date('2025-02-28T11:00:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b5823691b'),
    user: marky, username: 'marky',
    title: 'Underrated',
    rating: 4.5,
    body: 'People sleep on this place. The silog meals are solid and you get a lot for the price.',
    helpfulVotes: [miggy, kiks, sophia, bea], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: "Ha! We are glad you found us, Marky. Tell your barkada — the silog secret is out 🍳", author: 'owner', role: 'owner', createdAt: new Date('2025-04-12T09:00:00') }],
    createdAt: new Date('2025-04-10T08:30:00'), updatedAt: new Date('2025-04-10T08:30:00')
  },

  // Angrydobo
  {
    establishment: ObjectId('69a95a4dabf2603b5823691c'),
    user: kiks, username: 'kiks_m',
    title: 'Delicious adobo',
    rating: 5,
    body: 'Classic Filipino dishes done right. The adobo has the perfect balance of sour and savory.',
    helpfulVotes: [jane, ella, daniella, carlos, trisha, pau], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Your kind words mean everything to us, Kiks! The adobo recipe has been in the family for years. 🙏🇵🇭', author: 'owner', role: 'owner', createdAt: new Date('2025-01-27T09:00:00') }],
    createdAt: new Date('2025-01-25T12:30:00'), updatedAt: new Date('2025-01-25T12:30:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b5823691c'),
    user: sophia, username: 'sophia',
    title: 'Cozy vibes',
    rating: 4,
    body: 'Loved the adobo, place is small but comfy. Service could be faster.',
    helpfulVotes: [miggy, lance], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Thanks for the honest feedback, Sophia! We are training more staff to get orders out faster. Hope to see you again!', author: 'owner', role: 'owner', createdAt: new Date('2025-03-07T10:00:00') }],
    createdAt: new Date('2025-03-05T13:00:00'), updatedAt: new Date('2025-03-05T13:00:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b5823691c'),
    user: miggy, username: 'miggy',
    title: 'Authentic Filipino comfort food',
    rating: 4.5,
    body: 'Reminds me of home cooking. The pork adobo is phenomenal and the rice is always hot.',
    helpfulVotes: [marky, bea, pau], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Home cooking is exactly the feeling we want to give! The pork adobo is made fresh every morning. Thanks, Miggy! 🇵🇭', author: 'owner', role: 'owner', createdAt: new Date('2025-04-22T09:00:00') }],
    createdAt: new Date('2025-04-20T12:00:00'), updatedAt: new Date('2025-04-20T12:00:00')
  },

  // Dapit-Hapon
  {
    establishment: ObjectId('69a95a4dabf2603b5823691d'),
    user: daniella, username: 'daniella',
    title: 'Chill café',
    rating: 4,
    body: 'Perfect place to relax with friends. Drinks are great and the sunset view is nice.',
    helpfulVotes: [sophia, trisha, lance], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'Relaxing with friends is what Dapit-Hapon was made for! Come back for the sunset again soon 🌇', author: 'owner', role: 'owner', createdAt: new Date('2025-02-09T09:00:00') }],
    createdAt: new Date('2025-02-07T17:30:00'), updatedAt: new Date('2025-02-07T17:30:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b5823691d'),
    user: miggy, username: 'miggy',
    title: 'Nice menu',
    rating: 4.5,
    body: 'Lots of options and very tasty meals. The pasta dishes are standout.',
    helpfulVotes: [jane, ella, pau], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'The pasta is chef-made daily, Miggy! Glad the menu had something for everyone. Hope to see you back soon 🍝', author: 'owner', role: 'owner', createdAt: new Date('2025-03-14T09:00:00') }],
    createdAt: new Date('2025-03-12T18:00:00'), updatedAt: new Date('2025-03-12T18:00:00')
  },
  {
    establishment: ObjectId('69a95a4dabf2603b5823691d'),
    user: marky, username: 'marky',
    title: 'Great afternoon hangout',
    rating: 4,
    body: 'The name says it all — best visited in the afternoon. Good coffee and the ambiance is relaxing.',
    helpfulVotes: [daniella, bea, carlos], unhelpfulVotes: [],
    media: [], edited: false,
    responseThread: [{ body: 'The afternoon light here really is something special! Thanks for capturing the vibe perfectly, Marky ☀️', author: 'owner', role: 'owner', createdAt: new Date('2025-04-24T09:00:00') }],
    createdAt: new Date('2025-04-22T16:45:00'), updatedAt: new Date('2025-04-22T16:45:00')
  }

]);

print('Seed complete: ' + db.reviews.countDocuments() + ' reviews, ' + db.establishments.countDocuments() + ' establishments.');