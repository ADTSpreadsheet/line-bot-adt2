module.exports = {
  lineBot2: {
    accessToken: process.env.BOT2_ACCESS_TOKEN,
    channelSecret: process.env.BOT2_CHANNEL_SECRET,
  },

  lineBot3: {
    accessToken: process.env.BOT3_ACCESS_TOKEN,
    channelSecret: process.env.BOT3_CHANNEL_SECRET,
    targetUserId: process.env.BOT3_TARGET_USER_ID, // คุณตั้ม
  },

  adminUserId: process.env.ADMIN_LINE_USER_ID, // พี่เก่ง

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
  },
};
