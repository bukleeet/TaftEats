const Establishment = require('../models/establishments');
const v = require('../lib/validation');
const { discover } = require('../services/establishments');
const { HttpError } = require('../lib/errors');
exports.getAllEstablishments = async (req, res) => {
  const { page, limit, skip } = v.pagination(req.query);
  const q = v.text(req.query.q, 'Search', 80, { optional: true });
  const category = v.text(req.query.category, 'Category', 60, { optional: true });
  const sort = ['name', 'rating'].includes(req.query.sort) ? req.query.sort : 'name';
  const filter = {};
  if (q)
    filter.$or = ['name', 'description'].map((field) => ({
      [field]: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    }));
  if (category) filter.category = category;
  const { establishments, count, categories } = await discover({ filter, sort, skip, limit });
  res.render('establishments', {
    establishments,
    page,
    pages: Math.ceil(count / limit),
    count,
    q,
    category,
    sort,
    categories,
  });
};
exports.getEstablishmentById = async (req, res) => {
  const id = v.objectId(req.params.id);
  if (!(await Establishment.exists({ _id: id }))) throw new HttpError(404, 'Restaurant not found.');
  res.redirect(`/establishments/${id}/reviews`);
};
