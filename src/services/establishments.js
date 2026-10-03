const Establishment = require('../models/establishments');
const Review = require('../models/reviews');

const ratingStages = [
  {
    $lookup: {
      from: Review.collection.name,
      localField: '_id',
      foreignField: 'establishment',
      pipeline: [{ $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }],
      as: 'reviewTotals',
    },
  },
  {
    $set: {
      // Match the existing positive-rating Math.round behavior at one decimal place.
      rating: {
        $divide: [
          {
            $floor: {
              $add: [
                {
                  $multiply: [{ $ifNull: [{ $arrayElemAt: ['$reviewTotals.average', 0] }, 0] }, 10],
                },
                0.5,
              ],
            },
          },
          10,
        ],
      },
      reviewCount: { $ifNull: [{ $arrayElemAt: ['$reviewTotals.count', 0] }, 0] },
    },
  },
  { $project: { reviewTotals: 0 } },
];

async function discover({ filter, sort, skip, limit }) {
  const pageStages = [{ $skip: skip }, { $limit: limit }];
  const pipeline = [
    { $match: filter },
    ...(sort === 'rating'
      ? [...ratingStages, { $sort: { rating: -1, name: 1, _id: 1 } }, ...pageStages]
      : [{ $sort: { name: 1, _id: 1 } }, ...pageStages, ...ratingStages]),
  ];
  const [establishments, count, categories] = await Promise.all([
    Establishment.aggregate(pipeline).allowDiskUse(true),
    Establishment.countDocuments(filter),
    Establishment.distinct('category'),
  ]);
  return { establishments, count, categories };
}

module.exports = { discover };
