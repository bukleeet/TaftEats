// src/routes/establishmentRoutes.js
const express = require('express');
const router = express.Router();
const establishmentController = require('../controllers/establishmentController');

router.get('/establishments', establishmentController.getAllEstablishments);
router.get('/establishments/:id', establishmentController.getEstablishmentById);

module.exports = router;