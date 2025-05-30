const { supabase } = require('../utils/supabaseClient');

async function generateWorkshopSummary() {
  // ดึงข้อมูลคลาสทั้งหมด
  const { data, error } = await supabase
    .from('adt_workshop_attendees')
    .select('adt_class_no');

  if (error || !data) {
    console.error('Error fetching workshop data:', error);
    return '❌ เกิดข้อผิดพลาดในการดึงข้อมูลจากระบบ กรุณาลองใหม่ภายหลัง';
  }

  // สร้าง object สำหรับนับคนในแต่ละคลาส
  const summary = {};
  let total = 0;

  data.forEach(row => {
    const className = row.adt_class_no || 'ไม่ระบุคลาส';
    summary[className] = (summary[className] || 0) + 1;
    total++;
  });

  // จัดข้อความ
  let message = '📊 สรุปยอดผู้ลงทะเบียน ADTLive Workshop\n\n';
  Object.entries(summary).forEach(([cls, count]) => {
    message += `- ${cls}: ${count} คน\n`;
  });

  message += `\nรวมทั้งหมด: ${total} คน`;
  message += `\n(อัปเดตล่าสุด: ${new Date().toLocaleString('th-TH', { hour12: false })})`;

  return message;
}

module.exports = { generateWorkshopSummary };
