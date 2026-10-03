const Establishment = require('../models/establishments');
const v = require('../lib/validation');
const { ratings } = require('../services/reviews');
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
  // Rating is computed from source reviews so deletions and concurrent writes cannot leave stale totals.
  const totals = await ratings();
  let establishments = await Establishment.find(filter).sort({ name: 1 }).lean();
  establishments = establishments.map((e) => ({
    ...e,
    ...(totals.get(String(e._id)) || { rating: 0, reviewCount: 0 }),
  }));
  if (sort === 'rating')
    establishments.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
  const count = establishments.length;
  res.render('establishments', {
    establishments: establishments.slice(skip, skip + limit),
    page,
    pages: Math.ceil(count / limit),
    count,
    q,
    category,
    sort,
    categories: await Establishment.distinct('category'),
  });
};
exports.getEstablishmentById = async (req, res) => {
  const id = v.objectId(req.params.id);
  if (!(await Establishment.exists({ _id: id }))) throw new HttpError(404, 'Restaurant not found.');
  res.redirect(`/establishments/${id}/reviews`);
};
