const { log } = require('../../logger/logger');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

// مصفوفة الجمل الترحيبية الفخمة لكسر الملل (تتغير عشوائياً)
const creativeWelcomes = [
  "حَلَّتِ البَرَكَةُ وَأَشْرَقَتِ الأَنْوَارُ بِقُدُومِكُم ✨",
  "نَوَّرْتُم عَالَمَنَا الصَّغِير، أَهْلاً بِكُم فِي العَائِلَة 🏰",
  "قَدِمْتُم أَهْلاً وَوَطِئْتُم سَهْلاً، سُعَدَاء جِدّاً بِانْضِمَامِكُم 🎉",
  "بِقُلُوبٍ مِلْؤُهَا الحُبّ نَسْتَقْبِلُ بَصْمَتَكُم الجَدِيدَة 🌟"
];

module.exports = {
  config: {
    name: 'welcome',
    version: '6.0',
    author: 'Edit & Gemini',
    eventType: ['log:subscribe']
  },

  onStart: async ({ event, api }) => {
    try {
      if (event.logMessageType !== 'log:subscribe') return;

      const { threadID, logMessageData, author } = event;
      const botID = api.getCurrentUserID();

      if (author == botID) return;
      if (!logMessageData?.addedParticipants) return;

      const newUsers = logMessageData.addedParticipants
        .map(p => p.userFbId)
        .filter(id => id !== botID);

      if (!newUsers.length) return;

      await sendGroupWelcome(api, threadID, newUsers, author);

    } catch (error) {
      log('error', `Welcome event error: ${error.message}`);
    }
  }
};

async function sendGroupWelcome(api, threadID, userIDs, authorID) {
  try {
    const threadInfo = await api.getThreadInfo(threadID);
    const mentions = [];
    const cacheDir = path.join(__dirname, 'cache');
    fs.ensureDirSync(cacheDir);
    
    // إعداد الوقت والتاريخ بتوقيت الخرطوم
    const dateObj = new Date();
    const time = dateObj.toLocaleTimeString('ar-EG', { timeZone: 'Africa/Khartoum', hour12: true, hour: '2-digit', minute: '2-digit' });
    const dayName = dateObj.toLocaleDateString('ar-EG', { timeZone: 'Africa/Khartoum', weekday: 'long' });
    
    const hourInKhartoum = parseInt(dateObj.toLocaleTimeString('en-US', { timeZone: 'Africa/Khartoum', hour: '2-digit', hour12: false }));
    const timeGreeting = (hourInKhartoum >= 5 && hourInKhartoum < 12) ? "صباح الخير والمسرات ☀️" : "مساء النور والسرور ✨";

    const randomWelcomeText = creativeWelcomes[Math.floor(Math.random() * creativeWelcomes.length)];

    // جلب معلومات المضيف
    const authorInfo = await api.getUserInfo(authorID);
    const adderName = authorInfo?.[authorID]?.name || "المسؤول";
    const adderTag = `@${adderName}`;
    mentions.push({ tag: adderTag, id: authorID });

    const threadName = threadInfo.threadName || "المجموعة";

    // جلب بيانات أول عضو مضاف عشان نعمل ليه الصورة الهيبة
    const targetUserID = userIDs[0];
    const targetUserInfo = await api.getUserInfo(targetUserID);
    const targetName = targetUserInfo?.[targetUserID]?.name || "عضو جديد";
    
    // رابط صورة العضو الشخصية من فيسبوك
    const userAvatarUrl = `https://graph.facebook.com/${targetUserID}/picture?height=720&width=720&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`;

    let welcomeCardPath = null;

    try {
      // استخدام سيرفر ترحيب جاهز وفخم لدمج صورة العضو في خلفية هيبة
      const cardApiUrl = `https://api.popcat.xyz/welcomecard?background=https://cdn.wallpapersafari.com/39/38/z5R8s7.jpg&avatar=${encodeURIComponent(userAvatarUrl)}&text1=WELCOME&text2=${encodeURIComponent(targetName)}&text3=To+${encodeURIComponent(threadName)}`;
      
      const imgRes = await axios.get(cardApiUrl, { responseType: 'arraybuffer', timeout: 15000 });
      welcomeCardPath = path.join(cacheDir, `welcome_${crypto.randomBytes(4).toString('hex')}.png`);
      fs.writeFileSync(welcomeCardPath, Buffer.from(imgRes.data));
    } catch (err) {
      console.log("[Welcome Card Error]: ", err.message);
    }

    // --- [ تصميم النص المطور للترحيب ] ---
    let bodyText = `> ˼✨˹↜ تـرحـيـب APLIN الهيبة ↶\n`;
    bodyText += `╮──────────────⟢ـ\n`;
    bodyText += `┆˼👋˹┊ التـحـيـة ↜｢ ${timeGreeting} ｣\n`;
    bodyText += `┆˼👤˹┊ الـمـضـيـف ↜｢ ${adderTag} ｣\n`;
    bodyText += `┆˼🏰˹┊ الـمـجـمـوعـة ↜｢ ${threadName} ｣\n`;
    bodyText += `┆˼📅˹┊ الـيـوم ↜｢ ${dayName} ｣\n`;
    bodyText += `┆˼🕕˹┊ الـوقـت ↜｢ ${time} ｣\n`;
    bodyText += `╯──────────────⟢ـ\n`;
    bodyText += `> ˼🎁˹↜ الأعْـضَـاء الـجُـدُد ↶\n`;
    bodyText += `╮──────────────⟢ـ\n`;
    
    let count = 1;
    for (const id of userIDs) {
      const userInfo = await api.getUserInfo(id);
      const name = userInfo?.[id]?.name || "عضو جديد";
      const tag = `@${name}`;
      
      bodyText += `​❆˹┊ ◍ [ ${count} ] ↜ ${tag}\n`;
      mentions.push({ tag, id });
      count++;
    }

    bodyText += `​❆˹┊ ⸻⸻⸻⸻⸻\n`;
    bodyText += `🗣️˹┊ ${randomWelcomeText}\n`;
    bodyText += `╯──────────────⟢ـ\n`;
    bodyText += `┊˼📊˹┊ الـعـدد الآن ↜ ${threadInfo.participantIDs.length}\n`;
    bodyText += `┊˼🌟˹┊ منورنا يا ملك! | ✅`;

    const messagePayload = {
      body: bodyText,
      mentions: mentions
    };

    // لو الصورة اتصممت بنجاح، نضيفها كمرفق (Attachment) مع الرسالة
    if (welcomeCardPath && fs.existsSync(welcomeCardPath)) {
      messagePayload.attachment = fs.createReadStream(welcomeCardPath);
    }

    // إرسال الرسالة مع الصورة والمنشنات
    await api.sendMessage(messagePayload, threadID, () => {
      if (welcomeCardPath && fs.existsSync(welcomeCardPath)) {
        fs.unlinkSync(welcomeCardPath);
      }
    });

  } catch (error) {
    log('error', `sendGroupWelcome error: ${error.message}`);
  }
}
