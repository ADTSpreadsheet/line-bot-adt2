const { supabase } = require('../utils/supabaseClient');

exports.generateWorkshopSummary = async () => {
  const { data, error } = await supabase
    .from('adt_workshop_attendees')
    .select('adt_class_no');

  if (error) {
    console.error('[❌] ดึงข้อมูลล้มเหลว:', error);
    return 'เกิดข้อผิดพลาดในการดึงข้อมูล';
  }

  const summary = {};
  data.forEach(row => {
    const classNo = row.adt_class_no || 'ไม่ระบุ';
    summary[classNo] = (summary[classNo] || 0) + 1;
  });

  const lines = Object.entries(summary)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([classNo, count]) => `- ${classNo}: ${count} คน`);

  const total = data.length;
  const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  return `📊 สรุปยอดผู้ลงทะเบียน ADTLive Workshop\n\n${lines.join('\n')}\n\nรวมทั้งหมด: ${total} คน\n(อัปเดตล่าสุด: ${now})`;
};
