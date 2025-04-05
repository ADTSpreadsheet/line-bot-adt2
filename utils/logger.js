const logger = {
  info: (msg) => console.log(`ℹ️  INFO: ${msg}`),
  warn: (msg) => console.warn(`⚠️  WARNING: ${msg}`),
  error: (msg) => console.error(`❌ ERROR: ${msg}`),
};

module.exports = logger;
