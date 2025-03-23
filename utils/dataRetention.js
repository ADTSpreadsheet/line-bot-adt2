const { createClient } = require('@supabase/supabase-js');

class DataRetentionPolicy {
  constructor(supabaseUrl, supabaseKey, retentionPeriod = 90) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.retentionPeriod = retentionPeriod; // วัน
  }

  async purgeOldData() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPeriod);

    try {
      const { error } = await this.supabase
        .from('user_registrations')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;

      console.log('Purged old registration data');
    } catch (error) {
      console.error('Error purging old data:', error);
    }
  }

  scheduleDataPurge() {
    // ตั้งค่าให้ run ทุกๆ 30 วัน
    setInterval(() => this.purgeOldData(), 30 * 24 * 60 * 60 * 1000);
  }
}

module.exports = DataRetentionPolicy;
