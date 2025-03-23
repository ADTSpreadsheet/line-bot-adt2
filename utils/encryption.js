const crypto = require('crypto');

function encryptSensitiveData(data) {
  const secretKey = process.env.ENCRYPTION_KEY;
  const cipher = crypto.createCipher('aes-256-cbc', secretKey);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptSensitiveData(encryptedData) {
  const secretKey = process.env.ENCRYPTION_KEY;
  const decipher = crypto.createDecipher('aes-256-cbc', secretKey);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}
