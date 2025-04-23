const line = require('@line/bot-sdk');

const lineBot3 = new line.Client({
  channelAccessToken: process.env.BOT3_ACCESS_TOKEN,
  channelSecret: process.env.BOT3_CHANNEL_SECRET,
});

const lineBot2 = new line.Client({
  channelAccessToken: process.env.LINE_BOT2_ACCESS_TOKEN,
  channelSecret: process.env.LINE_BOT2_CHANNEL_SECRET,
});

const adminUserId = process.env.BOT3_TARGET_USER_ID;

module.exports = {
  lineBot3,
  lineBot2,
  adminUserId,
};
