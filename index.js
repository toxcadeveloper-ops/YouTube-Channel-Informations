const express = require('express');
const axios = require('axios');
const app = express();

// API kalitingizni shu yerga yozing
const API_KEY = 'SIZNING_API_KEYINGIZ'; 

app.get('/verify', async (req, res) => {
    // @ belgisini olib tashlaymiz va URL uchun kodlaymiz
    let handle = req.query.handle;
    if (!handle) return res.json({ status: "error", message: "Handle kiritilmadi" });
    
    handle = handle.replace('@', ''); 
    const userCode = req.query.code;

    try {
        // YouTube API uchun so'rov
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&key=${API_KEY}`;
        const search = await axios.get(searchUrl);
        
        if (!search.data.items || search.data.items.length === 0) {
            return res.json({ status: "error", message: "Kanal topilmadi" });
        }

        const channelId = search.data.items[0].snippet.channelId;
        const channelRes = await axios.get(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${API_KEY}`);
        
        const bio = channelRes.data.items[0].snippet.description || "";
        
        // Debug uchun konsolga yozamiz (Render logida ko'rinadi)
        console.log(`Tekshirilmoqda: ${handle}, Kod: ${userCode}, Bio topildi: ${bio.substring(0, 20)}...`);

        if (bio.includes(userCode)) {
            res.json({ status: "success", message: "Kanal tasdiqlandi!" });
        } else {
            res.json({ status: "error", message: "Kodni bio-dan topa olmadim." });
        }
    } catch (e) {
        console.error("Xatolik:", e.message);
        res.json({ status: "error", message: "API xatosi: " + e.message });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server ishga tushdi!");
});
