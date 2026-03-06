// src/controllers/establishmentController.js
const Establishment = require('../models/establishments');

exports.getAllEstablishments = async (req, res) => {
  try {
    const establishments = await Establishment.find().lean();
    res.render('establishments', { establishments });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.getEstablishmentById = async (req, res) => {
  try {
    const estId = req.params.id;
    const establishment = await Establishment.findById(estId).lean();
    if (!establishment) return res.status(404).send('Establishment not found');
    res.render('establishmentDetail', { establishment });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};