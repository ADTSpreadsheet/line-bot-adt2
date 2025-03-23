const crypto = require('crypto');

// คีย์การเข้ารหัสควรเก็บเป็น Environment Variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; 
const IV_LENGTH = 16; // Initial Vector length

class DataEncryption {
  // เข้ารหัสข้อมูล
  static encrypt(data) {
    try {
      // สร้าง Initial Vector
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // สร้าง Cipher
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
      
      // เข้ารหัสข้อมูล
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // รวม IV กับข้อมูลเข้ารหัส
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // ถอดรหัสข้อมูล
  static decrypt(encryptedData) {
    try {
      // แยก IV ออกจากข้อมูลเข้ารหัส
      const textParts = encryptedData.split(':');
      const iv = Buffer.from(textParts[0], 'hex');
      const encryptedText = textParts[1];
      
      // สร้าง Decipher
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
      
      // ถอดรหัสข้อมูล
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }
}

module.exports = DataEncryption;
