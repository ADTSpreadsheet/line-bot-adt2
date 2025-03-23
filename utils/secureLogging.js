const winston = require('winston');
const path = require('path');

class SecureLogger {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: path.join(__dirname, '../../logs/secure-access.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  logSensitiveAction(action, data) {
    this.logger.info(action, {
      sensitiveData: this.maskSensitiveData(data)
    });
  }

  logError(errorMessage, errorDetails) {
    this.logger.error(errorMessage, errorDetails);
  }

  maskSensitiveData(data) {
    const maskedData = { ...data };
    
    if (maskedData.national_id) {
      maskedData.national_id = `${maskedData.national_id.slice(0, 4)}******${maskedData.national_id.slice(-4)}`;
    }
    
    if (maskedData.phone) {
      maskedData.phone = `${maskedData.phone.slice(0, 3)}***${maskedData.phone.slice(-4)}`;
    }

    return maskedData;
  }
}

module.exports = new SecureLogger();
