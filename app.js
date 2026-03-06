// app.js
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// ===== ROUTES =====
const establishmentRoutes = require('./src/routes/establishmentRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const aboutRoutes = require('./src/routes/aboutRoutes');
app.use('/', aboutRoutes);

// ===== MIDDLEWARE =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src/public')));

// ===== VIEW ENGINE =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// ===== MONGODB CONNECTION =====
mongoose.connect('mongodb://127.0.0.1:27017/myDatabase')
  .then(() => console.log(`MongoDB connected to: ${mongoose.connection.db.databaseName}`))
  .catch(err => console.log('MongoDB connection error:', err));

// ===== ROUTES =====
app.use('/', establishmentRoutes);
app.use('/', reviewRoutes);

// Home redirect
app.get('/', (req, res) => res.redirect('/establishments'));

// ===== START SERVER =====
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));