const { log } = require('../../logger/logger');

// تخزين الأعضاء الذين تم الترحيب بهم لكل قروب
const welcomedUsers = new Set();

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
    version: '5.5',
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
    
    // إعداد الوقت والتاريخ بتوقيت الخرطوم
    const dateObj = new Date();
    const time = dateObj.toLocaleTimeString('ar-EG', { timeZone: 'Africa/Khartoum', hour12: true, hour: '2-digit', minute: '2-digit' });
    const dayName = dateObj.toLocaleDateString('ar-EG', { timeZone: 'Africa/Khartoum', weekday: 'long' });
    
    // التعديل الذكي الأول: جلب الساعة لتحديد تحية الصباح أو المساء
    const hourInKhartoum = parseInt(dateObj.toLocaleTimeString('en-US', { timeZone: 'Africa/Khartoum', hour: '2-digit', hour12: false }));
    const timeGreeting = (hourInKhartoum >= 5 && hourInKhartoum < 12) ? "صباح الخير والمسرات ☀️" : "مساء النور والسرور ✨";

    // التعديل الذكي الثاني: اختيار جملة ترحيبية فخمة بشكل عشوائي
    const randomWelcomeText = creativeWelcomes[Math.floor(Math.random() * creativeWelcomes.length)];

    // جلب معلومات المضيف بشكل صحيح
    const authorInfo = await api.getUserInfo(authorID);
    const adderName = authorInfo?.[authorID]?.name || "المسؤول";
    const adderTag = `@${adderName}`;
    mentions.push({ tag: adderTag, id: authorID });

    const threadName = threadInfo.threadName || "المجموعة";

    // --- [ تصميم الترحيب المطور بزخرفة بوتك وبلمسة فخمة ] ---
    let bodyText = `> ˼✨˹↜ تـرحـيـب APLIN ↶\n`;
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
    bodyText += `🗣️˹┊ ${randomWelcomeText}\n`; // سطر الجملة العشوائية المتغيرة
    bodyText += `╯──────────────⟢ـ\n`;
    bodyText += `┊˼📊˹┊ الـعـدد الآن ↜ ${threadInfo.participantIDs.length}\n`;
    bodyText += `┊˼🌟˹┊ سُعداء بوجودكم معنا! | ✅`;

    // إرسال الرسالة النصية الفخمة والمعدلة بالكامل
    await api.sendMessage({ body: bodyText, mentions }, threadID);

  } catch (error) {
    log('error', `sendGroupWelcome error: ${error.message}`);
  }
      }
