const express    = require('express');
const mongoose   = require('mongoose');
const path       = require('path');
const session    = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src/public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

const MONGO_URI = 'mongodb://127.0.0.1:27017/myDatabase';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected to: ' + mongoose.connection.db.databaseName))
  .catch(err => console.log('MongoDB connection error:', err));

app.use(session({
  secret: 'tafteats-secret-key',
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({ mongoUrl: MONGO_URI }),
  cookie: { httpOnly: true }
}));

// Make the logged-in user available to all EJS views via res.locals
app.use((req, res, next) => {
  res.locals.sessionUser = req.session.userId
    ? {
        _id:                req.session.userId,
        username:           req.session.username,
        role:               req.session.role,
        ownedEstablishment: req.session.ownedEstablishment
      }
    : null;
  next();
});

const aboutRoutes         = require('./src/routes/aboutRoutes');
const establishmentRoutes = require('./src/routes/establishmentRoutes');
const reviewRoutes        = require('./src/routes/reviewRoutes');
const authRoutes          = require('./src/routes/authRoutes');

app.use('/', aboutRoutes);
app.use('/', establishmentRoutes);
app.use('/', reviewRoutes);
app.use('/', authRoutes);

app.get('/', (req, res) => res.redirect('/establishments'));

const PORT = 3000;
app.listen(PORT, () => console.log('Server running on http://localhost:' + PORT));