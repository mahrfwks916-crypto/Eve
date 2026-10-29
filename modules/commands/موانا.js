const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const moment = require('moment-timezone');

const AZAD_API_BASE = "https://azadx69x.is-a.dev";
const AZAD_MUSIC_API = "https://azadx69x-all-apis-top.vercel.app/api/sing";
const MIDJOURNEY_API = "https://azadx69x-all-apis-top.vercel.app/api/mj";

const conversationMemory = {};

/* 🧠 برومبت التوجيه الاحترافي (Moana Persona) */
const MOANA_SYSTEM_PROMPT = {
  role: "system",
  content: `
أنتِ "موانا"، مساعدة ذكية جداً وخلفيتك البرمجية والتحليلية كخبير برمجيات ومحلل أكواد بارع.
إلى جانب الذكاء البرمجي والتحليلي الخارق، أنتِ محترفة في تعديل الصور وفهم محتواها البصري.

طريقة التعامل والأسلوب:
- تتحدثين بالعامية الدارجة السودانية البسيطة والذكية.
- رصينة، عبقرية، وقادرة على حل المشاكل البرمجية والبرومبتات المعقدة بسهولة وتفكيكها للمستخدم.
- إذا طلب المستخدم رسم شيء جديد أو تصميم فكرة، ابدئي ردك بكلمة DRAW: متبوعة بوصف دقيق جداً ومفصل ومحترف باللغة الإنجليزية في نفس السطر.
- إذا طلب تعديل صورة، قومي بتوجيهه وإفادته.
- تنهين ردودك دائماً بـ ؛-؛
- ردودك موزونة، بدون زخرفة، ومباشرة في صلب الكود أو التحليل.
`
};

const getUllashBaseUrl = async () => {
  try {
    const res = await axios.get("https://raw.githubusercontent.com/cyber-ullash/cyber-ullash/refs/heads/main/UllashApi.json", { timeout: 4000 });
    return res.data.api;
  } catch (e) { return null; }
};

const getHakimBaseUrl = async () => {
  try {
    const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json", { timeout: 4000 });
    return base.data.mahmud;
  } catch (e) { return null; }
};

const translateText = async (text) => {
  try {
    const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`, { timeout: 5000 });
    return res.data[0][0][0];
  } catch (error) { return text; }
};

module.exports = {
  config: {
    name: "موانا",
    aliases: ["moana", "مواني"],
    version: "74.0.0",
    author: "SINKO & Azad & Hakim",
    countDown: 3,
    prefix: false,
    category: "ai"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, type, messageReply, senderID } = event;
    let query = args.join(" ").trim();

    if (!conversationMemory[threadID]) {
      conversationMemory[threadID] = [MOANA_SYSTEM_PROMPT];
    }

    const cachePathDir = path.join(__dirname, 'cache');
    fs.ensureDirSync(cachePathDir);

    // ─── [ 1. فحص طلبات الأغاني ] ───
    const musicKeywords = ["اغنيه", "أغنية", "صوت", "شغل", "نزل", "اسمعني", "غنية"];
    if (query && musicKeywords.some(word => query.startsWith(word))) {
      const cleanQuery = query.replace(/^\S+\s*/, "").trim();
      if (cleanQuery) return handleMusicSearch(api, event, cleanQuery);
    }

    // ─── [ 2. فحص وجود صورة (تعديل الصور) ] ───
    let imageUrl = "";
    if (type === "message_reply" && messageReply.attachments?.[0]?.type === "photo") {
      imageUrl = messageReply.attachments[0].url;
    } else if (event.attachments?.[0]?.type === "photo") {
      imageUrl = event.attachments[0].url;
    }

    const editKeywords = ["عدلي", "سوي", "هاك", "تعديل", "صممي"];
    if (imageUrl && editKeywords.some(word => query.includes(word))) {
      return handleImageEditFallback(api, event, query, imageUrl);
    }

    // ─── [ 3. فحص طلبات التوليد والرسم (ميدجيرني MJ) ] ───
    const drawKeywords = ["ارسمي", "تخيلي", "صوري", "ميدجيرني", "mj", "draw", "imagine"];
    if (query && drawKeywords.some(word => query.startsWith(word))) {
      const cleanDrawQuery = query.replace(/^\S+\s*/, "").trim();
      if (cleanDrawQuery) return handleMidjourneyDraw(api, event, cleanDrawQuery);
    }

    // ─── [ 4. تحليل الصورة برمجياً لو وجدت ] ───
    let analysisResult = "";
    if (imageUrl) {
      api.setMessageReaction("🔍", messageID, () => {}, true);
      try {
        const baseRes = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
        const promptApi = `${baseRes.data.mahmud}/api/prompt`;
        
        const analysis = await axios.post(promptApi, {
          imageUrl: imageUrl,
          prompt: "Analyze this image thoroughly, list technical details, characters or code block visible." 
        }, { headers: { 'Content-Type': 'application/json' } });
        
        analysisResult = analysis.data.response || "";
      } catch (err) { console.error("Analysis failed:", err.message); }
    }

    // ─── [ 5. معالجة الشات والذكاء الاصطناعي بطريقة كيفن السريعة ] ───
    api.setMessageReaction("🧠", messageID, () => {}, true);

    try {
      let finalInput = query;
      if (analysisResult) {
        finalInput = `[التحليل البصري للصورة المرفقة: ${analysisResult}]\nطلب المستخدم: ${query || "حللي هذه الصورة برمجياً وتقنياً"}`;
      }

      if (!finalInput) return api.sendMessage("هلا كيف اخدمك ؛-؛", threadID, messageID);

      let userName = "زول";
      try {
        const info = await api.getUserInfo(senderID);
        if (info?.[senderID]?.name) userName = info[senderID].name.split(" ")[0];
      } catch {}

      const formattedUserQuery = `[${userName}]: ${finalInput}`;

      const history = conversationMemory[threadID];
      history.push({ role: "user", content: formattedUserQuery });

      if (history.length > 20) {
        history.splice(1, history.length - 20);
      }

      const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
      let formData = "";
      formData += `--${boundary}\r\nContent-Disposition: form-data; name="chat_style"\r\n\r\nchat\r\n`;
      formData += `--${boundary}\r\nContent-Disposition: form-data; name="chatHistory"\r\n\r\n${JSON.stringify(history)}\r\n`;
      formData += `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nstandard\r\n`;
      formData += `--${boundary}\r\nContent-Disposition: form-data; name="hacker_is_stinky"\r\n\r\nvery_stinky\r\n`;
      formData += `--${boundary}\r\nContent-Disposition: form-data; name="enabled_tools"\r\n\r\n[]\r\n`;
      formData += `--${boundary}--\r\n`;

      const response = await axios({
        method: "POST",
        url: "https://api.deepai.org/hacking_is_a_serious_crime",
        headers: {
          "content-type": `multipart/form-data; boundary=${boundary}`,
          origin: "https://deepai.org",
          "user-agent": "Mozilla/5.0"
        },
        data: formData
      });

      let aiResponse = "";
      if (response.data) {
        if (typeof response.data === "string") aiResponse = response.data;
        else if (response.data.output) aiResponse = response.data.output;
        else if (response.data.text) aiResponse = response.data.text;
      }

      aiResponse = aiResponse.replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
      if (!aiResponse) aiResponse = "ما ركزت معاك، قول تاني؟ ؛-؛";

      history.push({ role: "assistant", content: aiResponse });

      if (aiResponse.includes("DRAW:")) {
        const enDescription = aiResponse.split("DRAW:")[1].trim();
        return handleDrawing(api, event, query || "تصميم برمجى", enDescription);
      }

      const voiceKeywords = ["بصوت", "صوت", "سجلي", "قولي", "بصمة", "اشرحي بصوت"];
      const wantsVoice = voiceKeywords.some(word => query.toLowerCase().includes(word));

      if (wantsVoice) {
        try {
          const cleanTextForTTS = aiResponse.replace(/؛-؛/g, "").trim();
          const ttsUrl = `${AZAD_API_BASE}/api/voice-tts?text=${encodeURIComponent(cleanTextForTTS)}&voice=girls&language=ar-SA&format=mp3`;
          
          const ttsRes = await axios.get(ttsUrl, { responseType: "arraybuffer", timeout: 20000 });
          const voicePath = path.join(cachePathDir, `moana_say_${Date.now()}.mp3`);
          fs.writeFileSync(voicePath, Buffer.from(ttsRes.data));

          return api.sendMessage({
            body: aiResponse,
            attachment: fs.createReadStream(voicePath)
          }, threadID, (err, info) => {
            if (fs.existsSync(voicePath)) fs.unlinkSync(voicePath);
            if (!err && global.client?.handleReply) {
              global.client.handleReply.push({ name: "موانا", messageID: info.messageID, author: senderID });
            }
          }, messageID);
        } catch (ttsErr) { console.error("TTS Failed:", ttsErr.message); }
      }

      return api.sendMessage(aiResponse, threadID, (err, info) => {
        if (!err && global.client?.handleReply) {
          global.client.handleReply.push({ name: "موانا", messageID: info.messageID, author: senderID });
        }
      }, messageID);

    } catch (error) {
      console.error("Moana Core Error:", error.message);
      api.sendMessage("الشبكة تعبانة شوية، جرب تاني ؛-؛", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    const { threadID, messageID, body, senderID } = event;
    if (handleReply.author !== senderID) return;
    if (handleReply.type === "music_selection") return handleMusicDownload(api, event, handleReply);
    return this.onStart({ api, event, args: [body] });
  }
};

async function handleImageEditFallback(api, event, promptAr, imageUrl) {
  const { threadID, messageID } = event;
  api.setMessageReaction("⌛", messageID, () => {}, true);
  const waitMsg = await api.sendMessage(`> ˼🌌˹↜  Aplin Edit  ↶\nجاري تعديل صورتك والترجمة...`, threadID, messageID);
  const cachePath = path.join(__dirname, "cache", `edit_${crypto.randomBytes(4).toString('hex')}.png`);
  const promptEn = await translateText(promptAr);
  const hakimBaseURL = await getHakimBaseUrl();

  const servers = [
    { name: "SD", url: `https://uncensored-sd.onrender.com/api/sd?prompt=${encodeURIComponent(promptEn)}&imageUrl=${encodeURIComponent(imageUrl)}&v=${crypto.randomBytes(4).toString('hex')}`, method: "GET", responseType: "stream" },
    { name: "Azad", url: `https://azadx69x.is-a.dev/api/editor?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(promptEn)}`, method: "GET", responseType: "stream" }
  ];

  if (hakimBaseURL) {
    servers.push({ name: "Hakim", url: `${hakimBaseURL}/api/edit`, method: "POST", data: { prompt: promptEn, imageUrl: imageUrl }, responseType: "arraybuffer" });
  }

  let success = false;
  for (const server of servers) {
    try {
      let response = server.method === "POST" ? await axios.post(server.url, server.data, { responseType: server.responseType, timeout: 60000 }) : await axios({ method: 'get', url: server.url, responseType: server.responseType, timeout: 60000 });
      if (server.responseType === "stream") {
        const writer = fs.createWriteStream(cachePath);
        response.data.pipe(writer);
        await new Promise((res, rej) => { writer.on('finish', res); writer.on('error', rej); });
      } else {
        await fs.writeFile(cachePath, Buffer.from(response.data, 'binary'));
      }
      success = true; break;
    } catch (e) {}
  }

  if (success) {
    const timeNow = moment.tz("Africa/Khartoum");
    const successBody = `> ˼🌌˹↜  Aplin Edit  ↶\n╮──────────────⟢ـ\n┆ الوصف ↜｢ ${promptAr} ｣\n┆ الـوقـت ↜｢ ${timeNow.format("hh:mm A")} ｣\n╯──────────────⟢ـ\n> ظبطت ليك التعديل مية مية ؛-؛`;
    await api.sendMessage({ body: successBody, attachment: fs.createReadStream(cachePath) }, threadID, () => {
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      api.setMessageReaction("✅", messageID, () => {}, true);
      if (waitMsg) api.unsendMessage(waitMsg.messageID);
    }, messageID);
  } else {
    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage("⚠️ سيرفرات التعديل مضغوطة حالياً، جرب تاني يا ملك ؛-؛", threadID, messageID);
    if (waitMsg) api.unsendMessage(waitMsg.messageID);
  }
}

async function handleMidjourneyDraw(api, event, promptAr) {
  const { threadID, messageID } = event;
  api.setMessageReaction("🎨", messageID, () => {}, true);
  const waitMsg = await api.sendMessage(`> ˼🌌˹↜  Aplin Midjourney  ↶\nجاري توليد خيالك بالذكاء الاصطناعي...`, threadID, messageID);
  const cacheDir = path.join(__dirname, "cache");

  try {
    const promptEn = await translateText(promptAr);
    const response = await axios.get(`${MIDJOURNEY_API}?prompt=${encodeURIComponent(promptEn)}`, { timeout: 90000 });
    const result = response.data;
    if (!result.success || !result.data?.images?.length) throw new Error("No images");

    const attachments = [];
    for (let i = 0; i < result.data.images.length; i++) {
      const imgRes = await axios.get(result.data.images[i], { responseType: "arraybuffer", timeout: 30000 });
      const imgPath = path.join(cacheDir, `mj_${crypto.randomBytes(4).toString('hex')}_${i}.png`);
      fs.writeFileSync(imgPath, imgRes.data);
      attachments.push(fs.createReadStream(imgPath));
    }

    const timeNow = moment.tz("Africa/Khartoum");
    const successBody = `> ˼🌌˹↜  Aplin Midjourney  ↶\n╮──────────────⟢ـ\n┆ الـتـخـيـل ↜｢ ${promptAr} ｣\n┆ الـوقـت ↜｢ ${timeNow.format("hh:mm A")} ｣\n╯──────────────⟢ـ\n> رسمت ليك خيالك بدقة عالية ؛-؛`;

    await api.sendMessage({ body: successBody, attachment: attachments }, threadID, (err) => {
      attachments.forEach(att => { try { if (fs.existsSync(att.path)) fs.unlinkSync(att.path); } catch {} });
      if (!err) api.setMessageReaction("✅", messageID, () => {}, true);
      if (waitMsg) api.unsendMessage(waitMsg.messageID);
    }, messageID);
  } catch (err) {
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage("⚠️ سيرفر ميدجيرني مضغوط أو الوصف ممنوع يا ملك ؛-؛", threadID, messageID);
    if (waitMsg) api.unsendMessage(waitMsg.messageID);
  }
}

async function handleDrawing(api, event, originalQuery, enDescription) {
  const { threadID, messageID } = event;
  try {
    const imgPath = path.join(__dirname, 'cache', `art_${Date.now()}.png`);
    const imgRes = await axios.get(`https://image.pollinations.ai/prompt/${encodeURIComponent(enDescription)}`, { responseType: "arraybuffer" });
    fs.outputFileSync(imgPath, Buffer.from(imgRes.data));
    api.sendMessage({ body: `رسمت ليك طلبك بدقة عالية: ${originalQuery} ؛-؛`, attachment: fs.createReadStream(imgPath) }, threadID, () => fs.unlinkSync(imgPath), messageID);
  } catch (e) { api.sendMessage("الرسم فشل، جرب تاني ؛-؛", threadID); }
}

async function handleMusicSearch(api, event, songQuery) {
  const { threadID, messageID, senderID: userId } = event;
  api.setMessageReaction("🔍", messageID, () => {}, true);
  const infoMsg = await api.sendMessage('> ✾ ┇ جاري البحث عن الأغنية... أصبر شوية 🥱', threadID, messageID);
  const processingID = infoMsg.messageID;

  let results = []; let usedServer = ""; let ullashUrl = await getUllashBaseUrl();

  if (ullashUrl) {
    try {
      const searchRes = await axios.get(`${ullashUrl}/ytFullSearch?songName=${encodeURIComponent(songQuery)}`, { timeout: 15000 });
      if (searchRes.data?.length > 0) {
        results = searchRes.data.slice(0, 6).map(item => ({ title: item.title, time: item.time, id: item.id, thumbnail: item.thumbnail }));
        usedServer = "ullash";
      }
    } catch (e) {}
  }

  if (results.length === 0) {
    try {
      const searchRes = await axios.get(`${AZAD_MUSIC_API}?song=${encodeURIComponent(songQuery)}`, { timeout: 15000 });
      if (searchRes.data?.success && searchRes.data?.info) {
        const info = searchRes.data.info;
        results.push({ title: info.title, time: info.duration || "غير معروف", id: songQuery, thumbnail: info.image || info.thumbnail || "", directUrl: searchRes.data.audio?.url || null });
        usedServer = "azad";
      }
    } catch (e) {}
  }

  if (results.length === 0) {
    api.setMessageReaction("❌", messageID, () => {}, true);
    return api.editMessage('> ⏣ ❌ ما لقيت الأغنية دي.. السيرفرات واقفة 😒', processingID);
  }

  let msg = `> ˼🌌˹↜  Moana Music  ↶\n╮──────────────⟢ـ\n`;
  let attachments = []; let cacheFiles = [];

  for (let i = 0; i < results.length; i++) {
    msg += `  ${i + 1}. ｢ ${results[i].title} ｣\n┆⏱️ الـزمن: ${results[i].time}\n`;
    if (i < results.length - 1) msg += `┆⸻⸻⸻⸻⸻\n`;

    if (results[i].thumbnail) {
      const imgPath = path.join(__dirname, 'cache', `thumb_${crypto.randomBytes(4).toString('hex')}_${i}.jpg`);
      try {
        const imgRes = await axios.get(results[i].thumbnail, { responseType: 'arraybuffer', timeout: 5000 });
        fs.writeFileSync(imgPath, Buffer.from(imgRes.data));
        attachments.push(fs.createReadStream(imgPath));
        cacheFiles.push(imgPath);
      } catch (e) {}
    }
  }
  msg += `╯──────────────⟢ـ\n> 📥 رد برقم الأغنية عشان أنزلها ليك يا ملك`;

  api.unsendMessage(processingID);
  api.sendMessage({ body: msg, attachment: attachments }, threadID, (err, info) => {
    cacheFiles.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
    if (!err && global.client?.handleReply) {
      global.client.handleReply.push({ name: 'موانا', type: "music_selection", messageID: info.messageID, author: userId, result: results, usedServer: usedServer, ullashUrl: ullashUrl });
    }
  }, messageID);
}

async function handleMusicDownload(api, event, handleReply) {
  const { threadID, messageID, body } = event;
  const choice = parseInt(body);

  if (isNaN(choice) || choice > handleReply.result.length || choice <= 0) {
    return api.sendMessage("> ركز يا ملك.. اختر رقم متاح في القائمة فقط 🙄", threadID, messageID);
  }

  api.unsendMessage(handleReply.messageID);
  api.setMessageReaction("📥", messageID, () => {}, true);
  const loading = await api.sendMessage("> ✾ ┇ جاري تحميل الأغنية.. ثواني بس 📥", threadID);

  const selected = handleReply.result[choice - 1];
  const filePath = path.join(__dirname, 'cache', `music_${crypto.randomBytes(4).toString('hex')}.mp3`);
  let downloadUrl = null; let success = false;

  if (handleReply.usedServer === "ullash" && handleReply.ullashUrl) {
    try {
      const dlRes = await axios.get(`${handleReply.ullashUrl}/ytDl3?link=${selected.id}&format=mp3`, { timeout: 20000 });
      if (dlRes.data?.downloadLink) downloadUrl = dlRes.data.downloadLink;
    } catch (e) {}
  } else if (handleReply.usedServer === "azad" && selected.directUrl) {
    downloadUrl = selected.directUrl;
  }

  if (!downloadUrl) {
    try {
      const altRes = await axios.get(`${AZAD_MUSIC_API}?song=${encodeURIComponent(selected.title)}`, { timeout: 20000 });
      if (altRes.data?.success && altRes.data?.audio?.url) downloadUrl = altRes.data.audio.url;
    } catch (e) {}
  }

  if (downloadUrl) {
    try {
      const response = await axios({ method: 'get', url: downloadUrl, responseType: 'arraybuffer', timeout: 60000 });
      fs.writeFileSync(filePath, Buffer.from(response.data));
      success = true;
    } catch (err) {}
  }

  if (success) {
    const finalMsg = `> ˼🌌˹↜  Moana Music  ↶\n╮──────────────⟢ـ\n┆˼✅˹┊ الـحـالة ↜｢ تم التحميل بنجاح ｣\n┆˼🎵˹┊ الـعنوان ↜｢ ${selected.title} ｣\n╯──────────────⟢ـ\n> 🎧 جـاهـز لـلإسـتـمـاع يا ملك ؛-؛`;
    await api.sendMessage({ body: finalMsg, attachment: fs.createReadStream(filePath) }, threadID, () => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      api.setMessageReaction("✅", messageID, () => {}, true);
    }, messageID);
    api.unsendMessage(loading.messageID);
  } else {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage("> ⏣ ❌ الملف حجمه كبير أو السيرفرات واقفة، جرب تاني يا وهم 😒", threadID, messageID);
    api.unsendMessage(loading.messageID);
  }
}
