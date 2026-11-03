const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

const CACHE_DIR = path.join(__dirname, "cache");
const VIDEO_API_BASE = "https://eryxenx.agi.bd/api/video";

async function fetchVideoInfo(videoUrl) {
	const infoRes = await axios.get(VIDEO_API_BASE, {
		params: { url: videoUrl },
		timeout: 60000
	});

	const data = infoRes.data;
	if (!data?.success || !data?.downloadUrl) {
		throw new Error(data?.error || "downloadUrl paoa jayni API response e");
	}
	return data;
}

async function streamDownloadToFile(dlUrl, filePath) {
	fs.ensureDirSync(CACHE_DIR);

	const response = await axios.get(dlUrl, {
		responseType: "stream",
		timeout: 300000,
		maxContentLength: Infinity,
		maxBodyLength: Infinity,
		headers: {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
		}
	});

	const contentType = response.headers["content-type"] || "";
	const isValid = contentType.includes("video") || contentType.includes("octet-stream");

	if (!isValid) {
		let bodyText = "";
		try {
			const chunks = [];
			for await (const chunk of response.data) {
				chunks.push(chunk);
				if (Buffer.concat(chunks).length > 2000) break;
			}
			bodyText = Buffer.concat(chunks).toString("utf-8").slice(0, 500);
		} catch (_) {}

		throw new Error(`Invalid content received from downloadUrl (type: ${contentType})` + (bodyText ? ` — upstream said: "${bodyText.trim()}"` : ""));
	}

	const writer = fs.createWriteStream(filePath);

	await new Promise((resolve, reject) => {
		response.data.pipe(writer);
		let failed = false;
		const onError = (err) => {
			if (failed) return;
			failed = true;
			writer.close();
			fs.remove(filePath, () => {});
			reject(err);
		};
		response.data.on("error", onError);
		writer.on("error", onError);
		writer.on("close", () => { if (!failed) resolve(); });
	});

	const stats = fs.statSync(filePath);
	if (stats.size < 1024) {
		fs.remove(filePath, () => {});
		throw new Error(`Downloaded file too small (${stats.size} bytes) — corrupt ba failed download`);
	}
}

function extractApiErrorMessage(err) {
	const raw = err.response?.data;
	if (raw && typeof raw === "object" && !Buffer.isBuffer(raw)) {
		if (raw.error) return raw.error;
		if (raw.message) return raw.message;
	}
	if (raw) {
		try {
			const text = Buffer.isBuffer(raw) ? raw.toString("utf-8") : String(raw);
			const parsed = JSON.parse(text);
			if (parsed?.error) return parsed.error;
			if (parsed?.message) return parsed.message;
		} catch (_) {}
	}
	return err.message;
}

function tempFilePath(ext) {
	fs.ensureDirSync(CACHE_DIR);
	return path.join(CACHE_DIR, `video_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`);
}

async function sendWithRetry(api, threadID, msg, messageID, retries = 2) {
	for (let i = 0; i <= retries; i++) {
		try {
			return await new Promise((resolve, reject) => {
				api.sendMessage(msg, threadID, (err, info) => {
					if (err) reject(err);
					else resolve(info);
				}, messageID);
			});
		} catch (err) {
			const is408 = err?.error === 408 || String(err?.message || err).includes("408");
			if (is408 && i < retries) {
				await new Promise(r => setTimeout(r, 2000));
				continue;
			}
			throw err;
		}
	}
}

module.exports = {
	config: {
		name: "يوتيبوب",
		aliases: ["yt", "ytvideo", "فيديو"],
		version: "2.3.0",
		author: "EryXenX & SINKO",
		countDown: 5,
		role: 0,
		category: "media",
		guide: { en: "{pn} <video name>" }
	},

	onStart: async function ({ api, event, args }) {
		const { threadID, messageID } = event;
		const query = args.join(" ").trim();

		if (!query) {
			return api.sendMessage("من غير اسم؟ ", threadID, messageID);
		}

		api.setMessageReaction("⏳", messageID, () => {}, true);
		const waitMsg = await api.sendMessage(">..... 🧭", threadID, messageID);

		let file;
		try {
			const search = await yts(query);
			const video = search.videos?.[0];
			if (!video) {
				api.setMessageReaction("❌", messageID, () => {}, true);
				return api.editMessage("> .... 🧭", waitMsg.messageID);
			}

			const info = await fetchVideoInfo(video.url);
			file = tempFilePath("mp4");
			await streamDownloadToFile(info.downloadUrl, file);

			const successBody = `> ˼🌌˹↜  Aplin Video  ↶\n╮──────────────⟢ـ\n┆˼🎬˹┊ الـعـنـوان ↜｢ ${info.title || video.title} ｣\n╯──────────────⟢ـ\n> 📥 تم التحميل بنجاح يا ملك ؛-؛`;

			try { api.unsendMessage(waitMsg.messageID); } catch {}

			await sendWithRetry(api, threadID, {
				body: successBody,
				attachment: fs.createReadStream(file)
			}, messageID);

			api.setMessageReaction("✅", messageID, () => {}, true);

		} catch (e) {
			console.error("[VIDEO COMMAND ERROR]:", e?.response?.data || e.message || e);
			api.setMessageReaction("❌", messageID, () => {}, true);
			try { api.unsendMessage(waitMsg.messageID); } catch {}
			api.sendMessage("⚠️ فشل تحميل الفيديو: " + extractApiErrorMessage(e), threadID, messageID);
		} finally {
			if (file) {
				try { fs.remove(file, () => {}); } catch (_) {}
			}
		}
	}
};
