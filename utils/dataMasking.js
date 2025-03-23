class DataMasking {
  static maskNationalId(id) {
    return id ? `${id.slice(0, 4)}******${id.slice(-4)}` : id;
  }

  static maskPhone(phone) {
    return phone ? `${phone.slice(0, 3)}***${phone.slice(-4)}` : phone;
  }

  static maskIPAddress(ip) {
    return ip ? ip.split('.').map((octet, index) => 
      index === 3 ? '***' : octet
    ).join('.') : ip;
  }

  static maskEmail(email) {
    if (!email) return email;
    const [username, domain] = email.split('@');
    return `${username.slice(0, 2)}****@${domain}`;
  }

  static maskSensitiveData(data) {
    return {
      ...data,
      national_id: this.maskNationalId(data.national_id),
      phone: this.maskPhone(data.phone),
      ip_address: this.maskIPAddress(data.ip_address),
      email: this.maskEmail(data.email)
    };
  }
}

module.exports = DataMasking;
