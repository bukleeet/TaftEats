const Review = require('../models/reviews');
const { sanitize, mediaUrl } = require('../lib/validation');
function isReviewer(review, user) {
  return !!user && String(review.user?._id || review.user) === String(user._id);
}
function isOwner(review, user) {
  return (
    user?.role === 'owner' &&
    String(review.establishment?._id || review.establishment) === String(user.ownedEstablishment)
  );
}
function present(review, user) {
  const r = review.toObject ? review.toObject() : review;
  const id = user ? String(user._id) : null;
  const output = {
    ...r,
    body: sanitize(r.body),
    media: (r.media || []).map((url) => mediaUrl(url)),
    responseThread: (r.responseThread || []).map((msg) => ({ ...msg, body: sanitize(msg.body) })),
    helpfulCount: r.helpfulVotes?.length || 0,
    unhelpfulCount: r.unhelpfulVotes?.length || 0,
    userVote: r.helpfulVotes?.some((v) => String(v) === id)
      ? 'helpful'
      : r.unhelpfulVotes?.some((v) => String(v) === id)
        ? 'unhelpful'
        : null,
    isReviewer: isReviewer(r, user),
    isOwner: isOwner(r, user),
  };
  delete output.helpfulVotes;
  delete output.unhelpfulVotes;
  delete output.__v;
  return output;
}
async function ratings() {
  const rows = await Review.aggregate([
    { $group: { _id: '$establishment', rating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
  ]);
  return new Map(
    rows.map((r) => [
      String(r._id),
      { rating: Math.round(r.rating * 10) / 10, reviewCount: r.reviewCount },
    ]),
  );
}
module.exports = { isReviewer, isOwner, present, ratings };
