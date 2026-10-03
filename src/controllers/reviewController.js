const mongoose = require('mongoose');
const Review = require('../models/reviews');
const User = require('../models/users');
const Establishment = require('../models/establishments');
const v = require('../lib/validation');
const { HttpError } = require('../lib/errors');
const { isReviewer, isOwner, present, ratings } = require('../services/reviews');
const media = require('../services/media');

async function getReview(req) {
  if (req.review) return req.review;
  const review = await Review.findById(v.objectId(req.params.reviewId));
  if (!review) throw new HttpError(404, 'Review not found.');
  return review;
}
function requireReviewer(review, user) {
  if (!isReviewer(review, user))
    throw new HttpError(403, 'Only the original reviewer can change this review.');
}
async function list(req, res, establishment = null) {
  const { page, limit, skip } = v.pagination(req.query);
  const filter = establishment ? { establishment: establishment._id } : {};
  const count = await Review.countDocuments(filter);
  const reviews = await Review.find(filter)
    .select('-responseThread')
    .populate('establishment', 'name')
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  res.render('reviews', {
    reviews: reviews.map((r) => present(r, req.user)),
    establishment,
    page,
    pages: Math.ceil(count / limit),
    count,
  });
}
exports.getAllReviewsPage = (req, res) => list(req, res);
exports.getReviewsPage = async (req, res) => {
  const establishment = await Establishment.findById(v.objectId(req.params.id)).lean();
  if (!establishment) throw new HttpError(404, 'Restaurant not found.');
  Object.assign(
    establishment,
    (await ratings()).get(String(establishment._id)) || { rating: 0, reviewCount: 0 },
  );
  await list(req, res, establishment);
};
exports.getReviewDetail = async (req, res) => {
  const review = await Review.findById(v.objectId(req.params.reviewId))
    .populate('establishment', 'name')
    .lean();
  if (!review || !review.establishment) throw new HttpError(404, 'Review not found.');
  res.render('reviewDetail', { review: present(review, req.user) });
};
exports.createReview = async (req, res) => {
  const data = {
    title: v.text(req.body.title, 'Title', 120),
    body: v.richText(req.body.body),
    rating: v.rating(req.body.rating),
    establishment: v.objectId(req.body.establishment),
  };
  if (!(await Establishment.exists({ _id: data.establishment })))
    throw new HttpError(404, 'Restaurant not found.');
  if (String(req.user.ownedEstablishment) === data.establishment)
    throw new HttpError(403, 'Owners cannot review their own restaurant.');
  const urls = await media.uploadFiles(req.files);
  let review;
  try {
    review = await Review.create({
      ...data,
      user: req.user._id,
      username: req.user.username,
      media: urls,
    });
  } catch (err) {
    await media.deleteFiles(urls);
    throw err;
  }
  res
    .status(201)
    .json({ success: true, review: present(review, req.user), redirect: `/reviews/${review._id}` });
};
exports.editReview = async (req, res) => {
  const review = await getReview(req);
  requireReviewer(review, req.user);
  if (req.body.title !== undefined) review.title = v.text(req.body.title, 'Title', 120);
  if (req.body.body !== undefined) review.body = v.richText(req.body.body);
  if (req.body.rating !== undefined) review.rating = v.rating(req.body.rating);
  const removals =
    req.body.deleteMedia === undefined
      ? []
      : Array.isArray(req.body.deleteMedia)
        ? req.body.deleteMedia
        : [req.body.deleteMedia];
  if (
    removals.length > 10 ||
    removals.some((url) => typeof url !== 'string' || !review.media.includes(url))
  )
    throw new HttpError(400, 'You can only remove media attached to this review.');
  const kept = review.media.filter((url) => !removals.includes(url));
  if (kept.length + (req.files?.length || 0) > 10)
    throw new HttpError(400, 'A review can have up to 10 attachments.');
  const urls = await media.uploadFiles(req.files);
  review.media = [...kept, ...urls];
  review.edited = true;
  try {
    await review.save();
  } catch (err) {
    await media.deleteFiles(urls);
    throw err;
  }
  await media.deleteFiles(removals);
  res.json({ success: true, review: present(review, req.user) });
};
exports.deleteReview = async (req, res) => {
  const review = await getReview(req);
  requireReviewer(review, req.user);
  const deleted = await Review.deleteOne({ _id: review._id, user: req.user._id, __v: review.__v });
  if (!deleted.deletedCount) throw new HttpError(409, 'Review changed. Refresh and try again.');
  await media.deleteFiles(review.media);
  res.json({ success: true, redirect: `/establishments/${review.establishment}/reviews` });
};
exports.voteReview = async (req, res) => {
  if (!['helpful', 'unhelpful'].includes(req.body.voteType))
    throw new HttpError(400, 'Invalid vote type.');
  const userId = new mongoose.Types.ObjectId(req.user._id);
  const selected = `${req.body.voteType}Votes`;
  const other = req.body.voteType === 'helpful' ? 'unhelpfulVotes' : 'helpfulVotes';
  const review = await Review.findOneAndUpdate(
    { _id: v.objectId(req.params.reviewId), user: { $ne: userId } },
    [
      {
        $set: {
          [selected]: {
            $cond: [
              { $in: [userId, { $ifNull: [`$${selected}`, []] }] },
              { $setDifference: [`$${selected}`, [userId]] },
              { $setUnion: [{ $ifNull: [`$${selected}`, []] }, [userId]] },
            ],
          },
          [other]: { $setDifference: [{ $ifNull: [`$${other}`, []] }, [userId]] },
          __v: { $add: [{ $ifNull: ['$__v', 0] }, 1] },
        },
      },
    ],
    { new: true },
  );
  if (!review) {
    if (await Review.exists({ _id: req.params.reviewId }))
      throw new HttpError(403, 'You cannot vote on your own review.');
    throw new HttpError(404, 'Review not found.');
  }
  const r = present(review, req.user);
  res.json({
    success: true,
    helpfulCount: r.helpfulCount,
    unhelpfulCount: r.unhelpfulCount,
    userVote: r.userVote,
  });
};
async function respond(req, res, role) {
  const body = v.richText(req.body.body);
  const review = await getReview(req);
  if (role === 'owner' ? !isOwner(review, req.user) : !isReviewer(review, req.user))
    throw new HttpError(403, 'You cannot reply to this conversation.');
  const last = review.responseThread.at(-1);
  if (
    (role === 'owner' && last?.role === 'owner') ||
    (role === 'reviewer' && last?.role !== 'owner')
  )
    throw new HttpError(409, 'Wait for the other participant to reply.');
  if (review.responseThread.length >= 100)
    throw new HttpError(400, 'This conversation has reached its message limit.');
  review.responseThread.push({ body, author: req.user.username, authorId: req.user._id, role });
  await review.save();
  res.json({ success: true, responseThread: present(review, req.user).responseThread });
}
exports.ownerRespond = (req, res) => respond(req, res, 'owner');
exports.reviewerReply = (req, res) => respond(req, res, 'reviewer');
function ownsMessage(msg, review, user) {
  // Legacy messages without an immutable author ID must be migrated before editing.
  return (
    msg.authorId &&
    String(msg.authorId) === String(user._id) &&
    (msg.role === 'owner' ? isOwner(review, user) : isReviewer(review, user))
  );
}
exports.deleteLastThreadMessage = async (req, res) => {
  const review = await getReview(req);
  const msg = review.responseThread.at(-1);
  if (!msg) throw new HttpError(404, 'Message not found.');
  if (!ownsMessage(msg, review, req.user))
    throw new HttpError(403, 'Only the author can remove their last message.');
  review.responseThread.pop();
  await review.save();
  res.json({ success: true });
};
exports.editThreadMessage = async (req, res) => {
  if (!/^\d{1,3}$/.test(req.params.messageIndex))
    throw new HttpError(400, 'Invalid message index.');
  const review = await getReview(req);
  const msg = review.responseThread[Number(req.params.messageIndex)];
  if (!msg) throw new HttpError(404, 'Message not found.');
  if (!ownsMessage(msg, review, req.user))
    throw new HttpError(403, 'Only the author can edit this message.');
  msg.body = v.richText(req.body.body);
  msg.edited = true;
  msg.updatedAt = new Date();
  await review.save();
  res.json({ success: true });
};
exports.getUserProfileActivity = async (req, res) => {
  const userId = v.objectId(req.query.userId || String(req.user?._id || ''));
  if (!(await User.exists({ _id: userId }))) throw new HttpError(404, 'Profile not found.');
  const { page, limit, skip } = v.pagination(req.query);
  const count = await Review.countDocuments({ user: userId });
  const posts = await Review.find({ user: userId })
    .select('-responseThread')
    .populate('establishment', 'name')
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  const id = new mongoose.Types.ObjectId(userId);
  const recentReplies = await Review.aggregate([
    { $match: { 'responseThread.authorId': id } },
    { $unwind: '$responseThread' },
    { $match: { 'responseThread.authorId': id } },
    { $sort: { 'responseThread.createdAt': -1, 'responseThread._id': -1 } },
    { $limit: 30 },
    {
      $lookup: {
        from: Establishment.collection.name,
        localField: 'establishment',
        foreignField: '_id',
        as: 'place',
      },
    },
    {
      $project: {
        body: '$responseThread.body',
        createdAt: '$responseThread.createdAt',
        reviewTitle: '$title',
        reviewId: '$_id',
        establishmentName: {
          $ifNull: [{ $arrayElemAt: ['$place.name', 0] }, 'Removed restaurant'],
        },
      },
    },
  ]);
  const replies = recentReplies.map((reply) => ({ ...reply, body: v.sanitize(reply.body) }));
  res.json({
    success: true,
    posts: posts.map((r) => present(r, req.user)),
    replies,
    page,
    pages: Math.ceil(count / limit),
    count,
  });
};
