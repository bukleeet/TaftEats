// require('dotenv').config();

const express    = require('express');
const mongoose   = require('mongoose');
const path       = require('path');
const session    = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'src/public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected to: ' + mongoose.connection.db.databaseName))
  .catch(err => console.log('MongoDB connection error:', err));

app.use(session({
  secret: 'tafteats-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  cookie: { httpOnly: true }
}));

// Make the logged-in user available to all EJS views via res.locals
app.use((req, res, next) => {
  res.locals.sessionUser = req.session.userId
    ? {
        _id:                req.session.userId,
        username:           req.session.username,
        role:               req.session.role,
        avatar:             req.session.avatar || 'defaultprofile.png',
        ownedEstablishment: req.session.ownedEstablishment
      }
    : null;
  next();
});

const aboutRoutes         = require('./src/routes/aboutRoutes');
const establishmentRoutes = require('./src/routes/establishmentRoutes');
const reviewRoutes        = require('./src/routes/reviewRoutes');
const authRoutes          = require('./src/routes/authRoutes');
const registerRoutes      = require('./src/routes/registerRoutes');
const profileRoutes       = require('./src/routes/profileRoutes');

app.use('/', aboutRoutes);
app.use('/', establishmentRoutes);
app.use('/', reviewRoutes);
app.use('/', authRoutes);
app.use('/', registerRoutes);
app.use('/', profileRoutes);

app.get('/', (req, res) => res.redirect('/establishments'));

const PORT = 3000;
app.listen(PORT, () => console.log('Server running on http://localhost:' + PORT));
