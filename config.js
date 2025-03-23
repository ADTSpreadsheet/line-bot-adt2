require("dotenv").config();

module.exports = {
  lineBot2: {
    accessToken: process.env.LINE_BOT2_ACCESS_TOKEN,
    channelSecret: process.env.LINE_BOT2_CHANNEL_SECRET,
  },
  adminUserId: process.env.ADMIN_USER_ID,
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
  },
};
