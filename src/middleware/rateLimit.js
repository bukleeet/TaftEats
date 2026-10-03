const mongoose = require('mongoose');
const { rateLimit } = require('express-rate-limit');
const schema = new mongoose.Schema({ _id: String, totalHits: Number, resetTime: Date });
schema.index({ resetTime: 1 }, { expireAfterSeconds: 0 });
const Bucket = mongoose.model('RateLimitBucket', schema);
class MongoRateStore {
  constructor(prefix) {
    this.prefix = prefix;
  }
  init(options) {
    this.windowMs = options.windowMs;
  }
  async increment(key) {
    const now = Date.now();
    const resetTime = new Date((Math.floor(now / this.windowMs) + 1) * this.windowMs);
    const _id = `${this.prefix}:${key}:${resetTime.getTime()}`;
    let bucket;
    try {
      bucket = await Bucket.findOneAndUpdate(
        { _id },
        { $inc: { totalHits: 1 }, $setOnInsert: { resetTime } },
        { upsert: true, new: true },
      );
    } catch (err) {
      if (err.code !== 11000) throw err;
      bucket = await Bucket.findOneAndUpdate({ _id }, { $inc: { totalHits: 1 } }, { new: true });
    }
    return { totalHits: bucket.totalHits, resetTime: bucket.resetTime };
  }
  async decrement() {
    /* All attempts count. */
  }
  async resetKey() {
    /* Windows expire via TTL. */
  }
}
function limiter(prefix, limit, { persistent = true, windowMs = 15 * 60 * 1000 } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ...(persistent ? { store: new MongoRateStore(prefix) } : {}),
    message: { success: false, message: 'Too many requests. Please wait before trying again.' },
  });
}
module.exports = { limiter, Bucket };
