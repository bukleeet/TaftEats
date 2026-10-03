function readConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  if (!env.MONGO_URI) throw new Error('MONGO_URI is required.');
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32)
    throw new Error('SESSION_SECRET must be at least 32 characters.');
  const cloudKeys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const configured = cloudKeys.filter((key) => env[key]);
  if (configured.length && configured.length !== cloudKeys.length)
    throw new Error('Configure all three Cloudinary variables, or omit all three.');
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
  // Only configure a proxy hop when running behind the trusted deployment proxy.
  const trustProxy = env.TRUST_PROXY === '1' ? 1 : false;
  return {
    production,
    mongoUri: env.MONGO_URI,
    sessionSecret: env.SESSION_SECRET,
    port,
    trustProxy,
  };
}

module.exports = { readConfig };
