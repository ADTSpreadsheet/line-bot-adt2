function isValidRegistration(data) {
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

  return requiredFields.every((field) => data[field]);
}

module.exports = { isValidRegistration };
