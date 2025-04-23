module.exports = {
  lineBot1: {
    accessToken: process.env.BOT1_LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.BOT1_LINE_CHANNEL_SECRET,
  },

  lineBot2: {
    accessToken: process.env.LINE_BOT2_ACCESS_TOKEN,
    channelSecret: process.env.LINE_BOT2_CHANNEL_SECRET,
  },

  lineBot3: {
    accessToken: process.env.BOT3_ACCESS_TOKEN,
    channelSecret: process.env.BOT3_CHANNEL_SECRET,
    targetUserId: process.env.BOT3_TARGET_USER_ID,
  },

  adminUserId: process.env.ADMIN_LINE_USER_ID,

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
  },
};
