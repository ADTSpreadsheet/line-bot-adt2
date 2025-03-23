function isValidRegistration(data) {
 console.log('🔍 Validating Registration Data:', JSON.stringify(data, null, 2));

 const requiredFields = [
   "fullname",
   "address",
   "phone",
   "email",
   "citizen_id",
   "machine_id",
   "ip_address",
   "timestamp",
 ];

 const missingFields = requiredFields.filter(field => !data[field]);

 if (missingFields.length > 0) {
   console.warn('❌ Missing Fields:', missingFields);
   return false;
 }

 // เพิ่มการตรวจสอบเฉพาะ
 const validations = [
   { 
     field: 'phone', 
     validate: (value) => /^0\d{9}$/.test(value),
     message: 'Invalid phone number format'
   },
   { 
     field: 'email', 
     validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
     message: 'Invalid email format'
   },
   { 
     field: 'citizen_id', 
     validate: (value) => /^\d{13}$/.test(value),
     message: 'Invalid citizen ID'
   }
 ];

 const failedValidations = validations.filter(
   validation => !validation.validate(data[validation.field])
 );

 if (failedValidations.length > 0) {
   console.warn('❌ Failed Validations:', failedValidations);
   return false;
 }

 console.log('✅ Registration Data is Valid');
 return true;
}

module.exports = { isValidRegistration };
