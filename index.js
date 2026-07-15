const http = require('http');
const url = require('url');
const axios = require('axios');

const API_KEY = process.env.API_KEY;

/ Kiruvchi matndan qanday qidirish kerakligini ajratamiz:
/   @username / youtube.com/@username  -> forHandle
/   UCxxxx (kanal ID) / /channel/UCxxx  -> id
/   oddiy so'z                           -> forHandle (handle deb hisoblaymiz)
function buildChannelQuery(raw) {
    let input = (raw || "").trim();

    if (input.includes("youtube.com")) {
        const handleMatch = input.match(/@([\w\-]+)/);
        if (handleMatch) return `forHandle=${encodeURIComponent(handleMatch[1])}`;
        const chanMatch = input.match(/\/channel\/([\w\-]+)/);
        if (chanMatch) return `id=${encodeURIComponent(chanMatch[1])}`;
        const cMatch = input.match(/\/(c|user)\/([\w\-]+)/);
        if (cMatch) return `forHandle=${encodeURIComponent(cMatch[2])}`;
    }

    if (input.startsWith("@")) {
        return `forHandle=${encodeURIComponent(input.slice(1))}`;
    }

    if (input.startsWith("UC") && input.length > 18) {
        return `id=${encodeURIComponent(input)}`;
    }

    return `forHandle=${encodeURIComponent(input)}`;
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    console.log("Roblox'dan so'rov keldi! URL:", req.url);

    const parsed = url.parse(req.url, true);

    if (parsed.pathname === '/verify') {
        const { channelId, code } = parsed.query;

        if (!channelId || !code) {
            return res.end(JSON.stringify({ status: "error", message: "channelId yoki code kiritilmagan!" }));
        }

        try {
            const query = buildChannelQuery(channelId);
            const channelUrl = `https:/www.googleapis.com/youtube/v3/channels?part=snippet,statistics&${query}&key=${API_KEY}`;
            const channelRes = await axios.get(channelUrl);
            const channelData = channelRes.data;

            if (!channelData.items || channelData.items.length === 0) {
                return res.end(JSON.stringify({ status: "error", message: "Kanal topilmadi!" }));
            }

            const channel = channelData.items[0];
            const description = channel.snippet.description || "";

            if (!description.includes(code)) {
                return res.end(JSON.stringify({ status: "error", message: "Kod kanal tavsifida topilmadi!" }));
            }

            const searchUrl = `https:/www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel.id}&maxResults=1&order=date&type=video&key=${API_KEY}`;
            const searchRes = await axios.get(searchUrl);
            const searchData = searchRes.data;

            if (!searchData.items || searchData.items.length === 0) {
                return res.end(JSON.stringify({
                    status: "success",
                    channelStats: channel.statistics,
                    channelTitle: channel.snippet.title,
                    lastVideoStats: null
                }));
            }

            const latestVideoId = searchData.items[0].id.videoId;
            const videoUrl = `https:/www.googleapis.com/youtube/v3/videos?part=statistics&id=${latestVideoId}&key=${API_KEY}`;
            const videoRes = await axios.get(videoUrl);
            const videoData = videoRes.data;
            const videoStats = (videoData.items && videoData.items[0]) ? (videoData.items[0].statistics || {}) : {};

            return res.end(JSON.stringify({
                status: "success",
                channelStats: channel.statistics,
                channelTitle: channel.snippet.title,
                lastVideoStats: videoStats
            }));

        } catch (error) {
            console.error("Xatolik yuz berdi:", error.message);
            return res.end(JSON.stringify({ status: "error", message: "API bilan bog'lanishda xatolik." }));
        }
    } else {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: "Sahifa topilmadi" }));
    }
});

server.listen(3000, () => {
    console.log("Server 3000-portda ishga tushdi!");
});
