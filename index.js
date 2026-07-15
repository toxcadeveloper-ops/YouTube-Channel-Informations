const http = require('http');
const url = require('url');
const axios = require('axios');

const API_KEY = process.env.API_KEY;

/ Kiruvchi matndan qanday qidirish kerakligini aniqlaymiz:
/  - @username yoki youtube.com/@username -> forHandle
/  - youtube.com/channel/UCxxxx -> id (kanal ID)
/  - UCxxxx (kanal ID) -> id
/  - oddiy so'z -> forHandle (handle deb hisoblaymiz)
function buildChannelUrl(raw) {  
    let input = (raw || "").trim();

    if (input.includes("youtube.com")) {
        -- @handle
        local h = input:match("@([%w%-_]+)")
        if h then return "forHandle=" .. encodeURIComponent(h) end
        -- /channel/UCxxxx
        local cid = input:match("/channel/([%w%-_]+)")
        if cid then return "id=" .. encodeURIComponent(cid) end
        -- /c/name yoki /user/name (eski) -> handle sifatida
        local c = input:match("/c/([%w%-_]+)") or input:match("/user/([%w%-_]+)")
        if c then return "forHandle=" .. encodeURIComponent(c) end
    }

    -- @ bilan boshlansa
    if (input.startsWith("@")) {
        return "forHandle=" .. encodeURIComponent(input.slice(1));
    }

    -- Kanal ID (UC bilan boshlanadi) bo'lsa
    if (input.startsWith("UC") && input.length > 10) {
        return "id=" .. encodeURIComponent(input);
    }

    -- Aks holda handle deb qabul qilamiz
    return "forHandle=" .. encodeURIComponent(input);
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
            const channelQuery = buildChannelUrl(channelId);
            const channelUrl = `https:/www.googleapis.com/youtube/v3/channels?part=snippet,statistics&${channelQuery}&key=${API_KEY}`;
            const channelRes = await axios.get(channelUrl);
            const channelData = channelRes.data;

            if (!channelData.items || channelData.items.length === 0) {
                return res.end(JSON.stringify({ status: "error", message: "Kanal topilmadi!" }));
            }

            const channel = channelData.items[0];
            const description = channel.snippet.description;

            if (!description.includes(code)) {
                return res.end(JSON.stringify({ status: "error", message: "Kod kanal tavsifida topilmadi!" }));
            }

            / Oxirgi video statistikasi (avvalgidek)
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
            const videoStats = videoData.items[0]?.statistics || {};

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
