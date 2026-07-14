const http = require('http');
const url = require('url');
const axios = require('axios'); // Axios modullini chaqiramiz

const API_KEY = process.env.API_KEY;

const server = http.createServer(async (req, res) => {
    // Har doim javob JSON formatida qaytishini ta'minlash uchun header qo'shamiz
    res.setHeader('Content-Type', 'application/json');

    // Kelgan so'rovni konsolga chiqarish (Siz istagan Render logi)
    console.log("Roblox'dan so'rov keldi! URL:", req.url);

    const parsed = url.parse(req.url, true);
    
    // 1. Kanalni verifikatsiya qilish va statistika olish
    if (parsed.pathname === '/verify') {
        const { channelId, code } = parsed.query;

        if (!channelId || !code) {
            return res.end(JSON.stringify({ status: "error", message: "channelId yoki code kiritilmagan!" }));
        }
        
        try {
            // A. Kanal ma'lumotlarini olish
            const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${API_KEY}`;
            const channelRes = await axios.get(channelUrl);
            
            const channelData = channelRes.data;
            if (!channelData.items || channelData.items.length === 0) {
                return res.end(JSON.stringify({ status: "error", message: "Kanal topilmadi!" }));
            }

            const channel = channelData.items[0];
            const description = channel.snippet.description;

            // B. Kodni kanal tavsifidan qidirish
            if (!description.includes(code)) {
                return res.end(JSON.stringify({ status: "error", message: "Kod kanal tavsifida topilmadi!" }));
            }

            // D. Oxirgi videoni qidirish
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=1&order=date&type=video&key=${API_KEY}`;
            const searchRes = await axios.get(searchUrl);
            const searchData = searchRes.data;

            if (!searchData.items || searchData.items.length === 0) {
                // Agar kanalda video bo'lmasa, faqat kanal statistikasini qaytaramiz
                return res.end(JSON.stringify({ 
                    status: "success", 
                    channelStats: channel.statistics,
                    lastVideoStats: null 
                }));
            }

            const latestVideoId = searchData.items[0].id.videoId;

            // E. O'sha oxirgi videoning ko'rishlar va layklar sonini olish
            const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${latestVideoId}&key=${API_KEY}`;
            const videoRes = await axios.get(videoUrl);
            const videoData = videoRes.data;

            const videoStats = videoData.items[0]?.statistics || {};

            // F. Roblox'ga muvaffaqiyatli javob qaytarish
            return res.end(JSON.stringify({ 
                status: "success", 
                channelStats: channel.statistics,
                lastVideoStats: videoStats 
            }));

        } catch (error) {
            console.error("Xatolik yuz berdi:", error.message);
            return res.end(JSON.stringify({ status: "error", message: "API bilan bog'lanishda xatolik." }));
        }
    } else {
        // Boshqa barcha URL'lar uchun 404 xatolik
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: "Sahifa topilmadi" }));
    }
});

server.listen(3000, () => {
    console.log("Server 3000-portda ishga tushdi!");
});
