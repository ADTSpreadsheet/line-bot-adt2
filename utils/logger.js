// utils/logger.js (เวอร์ชันใหม่)
const createModuleLogger = (moduleName) => {
  return {
    info: (msg) => console.info(`[INFO] [${moduleName}] ${msg}`),
    warn: (msg) => console.warn(`[WARN] [${moduleName}] ${msg}`),
    error: (msg) => console.error(`[ERROR] [${moduleName}] ${msg}`),
    success: (msg) => console.log(`✅ [${moduleName}] ${msg}`)
  };
};

module.exports = { createModuleLogger };
