function maskSensitiveInfo(data) {
  return {
    ...data,
    national_id: maskNationalId(data.national_id),
    phone: maskPhone(data.phone),
    ip_address: maskIPAddress(data.ip_address)
  };
}

function maskNationalId(id) {
  return id ? `${id.slice(0, 4)}******${id.slice(-4)}` : id;
}

function maskPhone(phone) {
  return phone ? `${phone.slice(0, 3)}***${phone.slice(-4)}` : phone;
}

function maskIPAddress(ip) {
  return ip ? ip.split('.').map((octet, index) => 
    index === 3 ? '***' : octet
  ).join('.') : ip;
}
