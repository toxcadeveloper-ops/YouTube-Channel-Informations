const express = require('express');
const axios = require('axios');
const app = express();
const API_KEY = 'YOUR_GOOGLE_API_KEY';

app.get('/verify', async (req, res) => {
    const handle = req.query.handle;
    const userCode = req.query.code;

    try {
        const search = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${handle}&key=${API_KEY}`);
        const channelId = search.data.items[0].snippet.channelId;
        const channel = await axios.get(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${API_KEY}`);
        
        const bio = channel.data.items[0].snippet.description;
        if (bio.includes(userCode)) {
            res.json({ status: "success", message: "Kanal tasdiqlandi!" });
        } else {
            res.json({ status: "error", message: "Kodni bio-dan topa olmadim." });
        }
    } catch (e) {
        res.json({ status: "error", message: e.message });
    }
});
app.listen(process.env.PORT || 3000);
