const os = require('os');
const { performance } = require('perf_hooks');
const moment = require('moment-timezone');
const fs = require('fs-extra');
const path = require('path');

const configPath = path.join(__dirname, '..', '..', 'config', 'config.json');

module.exports = {
  config: {
    name: 'ابتايم',
    aliases: ['uptime', 'up', 'stats'],
    version: '3.1.0',
    author: 'SINKO',
    description: 'عرض حالة النظام بالزخرفة الملكية (للمطور)',
    countDown: 5,
    prefix: true,
    category: 'utility',
    adminOnly: true 
  },

  onStart: async ({ api, event }) => {
    const { threadID, messageID, senderID } = event;
    
    // جلب الـ Config للتأكد من الأدمن
    let config;
    try {
      config = fs.readJsonSync(configPath);
    } catch (e) {
      config = {};
    }
    const adminList = config.adminUIDs || [];

    if (!adminList.includes(senderID)) {
      return api.sendMessage("🫦", threadID, messageID);
    }

    // 1. إرسال الرسالة الأولية وتخزين الـ messageID لتعديلها لاحقاً
    const initialMsg = await api.sendMessage("⏳ | حاضر يا بابا، جاري فحص النظام...", threadID, messageID);

    api.setMessageReaction("❄️", messageID, (err) => {}, true);

    try {
      // حساب وقت التشغيل (Uptime)
      const uptimeSeconds = process.uptime();
      const days = Math.floor(uptimeSeconds / 86400);
      const hours = Math.floor((uptimeSeconds % 86400) / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);
      const seconds = Math.floor(uptimeSeconds % 60);

      // جلب التاريخ والوقت بتوقيت السودان
      const timeNow = moment.tz("Africa/Khartoum");
      const fullDate = timeNow.format("DD / MM / YYYY");
      const dayName = timeNow.locale('ar').format("dddd");
      const timeStr = timeNow.format("hh:mm:ss A");

      // إحصائيات النظام
      const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
      const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
      const ping = Math.floor(performance.now() % 1000);
      
      let threadCount = 'غير متوفر';
      try {
        const threadList = await api.getThreadList(100, null, ["INBOX"]);
        threadCount = threadList.length;
      } catch (e) {}

      // بناء الرسالة بالزخرفة الملكية المطلوبة
      const message = `> ˼⏰˹↜ حـالـة الـنـظـام ↶
╮──────────────⟢ـ
┆˼🧭˹┊ الـتـاريـخ ↜｢ ${fullDate} ｣
┆˼⚕️˹┊ الـيـوم ↜｢ ${dayName} ｣
┆˼🕕˹┊ الـوقـت ↜｢ ${timeStr} ｣
┆˼🚀˹┊ الـبـنـغ ↜｢ ${ping}ms ｣
╯──────────────⟢ـ
> ˼🌌˹↜ إحـصـائـيـات ابلين ↶
╮──────────────⟢ـ
┆˼⏳˹┊ الـتـشـغـيل ↜｢ ${days}يوم و ${hours}س و ${minutes}د ｣
┆˼👥˹┊ الـمـجـموعات ↜｢ ${threadCount} ｣
┆˼🧠˹┊ الـرام الـمستخدم ↜｢ ${ramUsage}MB ｣
┆˼📂˹┊ إجـمـالي الـرام ↜｢ ${totalRam}GB ｣
╯──────────────⟢ـ
> ˼🖥️˹↜ مـعـلـومـات الـسـيـرفـر ↶
╮──────────────⟢ـ
┆˼❄️˹┊ الـنـظـام ↜｢ ${os.type()} ｣
┆˼𖣔˹┊ الـمـعـالـج ↜｢ ${os.cpus()[0].model.split(' ')[0]} ｣
┆˼✅˹┊ الـحـالـة ↜｢ مـتـصل بنجاح ｣
╯──────────────⟢ـ
> ˼👤˹┊ الـمـطـوࢪ : SINKO ↶`;

      // 2. تعديل الرسالة السابقة بالتقرير النهائي
      await api.editMessage(message, initialMsg.messageID);
      api.setMessageReaction("✅", messageID, () => {}, true);

    } catch (error) {
      console.error('Uptime error:', error);
      api.editMessage('❌ حدث خطأ أثناء جلب بيانات راندر.', initialMsg.messageID);
    }
  },
};
