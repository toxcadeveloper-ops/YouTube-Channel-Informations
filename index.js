const http = require('http');
const url = require('url');
const axios = require('axios');

const API_KEY = process.env.API_KEY;

console.log("[START] Server skripti yuklandi. API_KEY mavjud:", API_KEY ? ("HA (" + API_KEY.slice(0, 6) + "...)") : "YO'Q!");

if (!API_KEY) {
    console.error("[XATO] API_KEY env topilmadi! Render Environment da API_KEY ni o'rnating.");
}

function buildChannelQuery(raw) {
    let input = (raw || "").trim();
    console.log("[QUERY] kiruvchi matn:", input);

    if (input.includes("youtube.com")) {
        const handleMatch = input.match(/@([\w\-]+)/);
        if (handleMatch) { const h = "@" + handleMatch[1]; console.log("[QUERY] rejim: forHandle (handle)"); return `forHandle=${encodeURIComponent(h)}`; }
        const chanMatch = input.match(/\/channel\/([\w\-]+)/);
        if (chanMatch) { console.log("[QUERY] rejim: id (channel)"); return `id=${encodeURIComponent(chanMatch[1])}`; }
        const cMatch = input.match(/\/(c|user)\/([\w\-]+)/);
        if (cMatch) { const h = "@" + cMatch[2]; console.log("[QUERY] rejim: forHandle (c/user)"); return `forHandle=${encodeURIComponent(h)}`; }
    }

    if (input.startsWith("@")) { console.log("[QUERY] rejim: forHandle (@)"); return `forHandle=${encodeURIComponent(input)}`; }
    if (input.startsWith("UC") && input.length > 18) { console.log("[QUERY] rejim: id (UC)"); return `id=${encodeURIComponent(input)}`; }

    console.log("[QUERY] rejim: forHandle (default, @ qo'shildi)");
    return `forHandle=${encodeURIComponent("@" + input)}`;
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    console.log("[REQ] keldi:", req.method, req.url);

    const parsed = url.parse(req.url, true);

    if (parsed.pathname === '/test') {
        console.log("[TEST] test so'rovi");
        return res.end(JSON.stringify({ status: "ok", message: "Server ishlayapti", keySet: !!API_KEY }));
    }

    if (parsed.pathname === '/verify') {
        const { channelId, code } = parsed.query;
        console.log("[VERIFY] channelId:", channelId, "| code:", code);

        if (!channelId || !code) {
            console.log("[VERIFY] channelId yoki code yo'q");
            return res.end(JSON.stringify({ status: "error", message: "channelId yoki code kiritilmagan!" }));
        }

        try {
            const query = buildChannelQuery(channelId);
            // MUHIM: contentDetails qo'shildi -> uploads playlist olish uchun (baribar 1 birlik)
            const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&${query}&key=${API_KEY}`;
            console.log("[YT] channel so'rovi:", channelUrl);
            const channelRes = await axios.get(channelUrl);
            const channelData = channelRes.data;
            console.log("[YT] channel javobi: items soni =", channelData.items ? channelData.items.length : 0);

            if (!channelData.items || channelData.items.length === 0) {
                console.log("[YT] kanal topilmadi");
                return res.end(JSON.stringify({ status: "error", message: "Kanal topilmadi!" }));
            }

            const channel = channelData.items[0];
            const title = channel.snippet.title;
            const description = channel.snippet.description || "";
            console.log("[YT] kanal topildi:", title);
            console.log("[YT] description uzunligi:", description.length);
            console.log("[YT] kod description ichida:", description.includes(code));

            if (!description.includes(code)) {
                console.log("[YT] kod bio-da yo'q");
                return res.end(JSON.stringify({ status: "error", message: "Kod kanal tavsifida topilmadi!" }));
            }

            // ===== search.list (100 birlik) O'RNIGA uploads playlist (1 birlik) =====
            console.log("[YT] kod topildi, oxirgi video uploads playlist orqali olinmoqda...");
            const uploadsPlaylistId =
                channel.contentDetails &&
                channel.contentDetails.relatedPlaylists &&
                channel.contentDetails.relatedPlaylists.uploads;

            if (!uploadsPlaylistId) {
                console.log("[YT] uploads playlist topilmadi, statistikasiz qaytamiz");
                return res.end(JSON.stringify({
                    status: "success",
                    channelStats: channel.statistics,
                    channelTitle: title,
                    lastVideoStats: null
                }));
            }

            const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=1&key=${API_KEY}`;
            const playlistRes = await axios.get(playlistUrl);
            const playlistData = playlistRes.data;
            console.log("[YT] playlistItems javobi: items soni =", playlistData.items ? playlistData.items.length : 0);

            if (!playlistData.items || playlistData.items.length === 0) {
                console.log("[YT] video yo'q, statistikasiz qaytamiz");
                return res.end(JSON.stringify({
                    status: "success",
                    channelStats: channel.statistics,
                    channelTitle: title,
                    lastVideoStats: null
                }));
            }

            const latestVideoId = playlistData.items[0].contentDetails.videoId;
            console.log("[YT] eng yangi video:", latestVideoId);
            const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${latestVideoId}&key=${API_KEY}`;
            const videoRes = await axios.get(videoUrl);
            const videoData = videoRes.data;
            const videoStats = (videoData.items && videoData.items[0]) ? (videoData.items[0].statistics || {}) : {};
            console.log("[YT] video statistikasi:", JSON.stringify(videoStats));

            return res.end(JSON.stringify({
                status: "success",
                channelStats: channel.statistics,
                channelTitle: title,
                lastVideoStats: videoStats
            }));

        } catch (error) {
            console.error("[XATO] YouTube API xatolik:", error.response ? error.response.status : error.message);
            if (error.response && error.response.data) {
                console.error("[XATO] YouTube javobi:", JSON.stringify(error.response.data));
            }
            const ytMsg = error.response && error.response.data && error.response.data.error
                ? error.response.data.error.message
                : error.message;
            return res.end(JSON.stringify({ status: "error", message: "YouTube API xatolik: " + ytMsg }));
        }
    } else {
        console.log("[404] noma'lum yo'l:", parsed.pathname);
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: "Sahifa topilmadi" }));
    }
});

server.listen(3000, () => {
    console.log("[START] Server 3000-portda ishga tushdi!");
});
