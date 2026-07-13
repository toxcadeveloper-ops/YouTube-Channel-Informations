const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/verify', async (req, res) => {
    const channelId = req.query.id;
    const userCode = req.query.code;
    const API_KEY = 'SIZNING_API_KEYINGIZ'; // API kalitingizni o'zgartirmang

    try {
        const response = await axios.get(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${API_KEY}`);
        
        if (!response.data.items || response.data.items.length === 0) {
            return res.json({ status: "error", message: "Kanal topilmadi" });
        }

        const channel = response.data.items[0];
        const description = channel.snippet.description || "";

        // Debug va Tekshiruv
        if (description.includes(userCode)) {
            res.json({ 
                status: "success", 
                message: "Kanal tasdiqlandi!",
                subscriberCount: channel.statistics.subscriberCount,
                viewCount: channel.statistics.viewCount
            });
        } else {
            res.json({ 
                status: "error", 
                message: "Kodni topa olmadim", 
                debug: `Bio: ${description.substring(0, 30)}... Ichida '${userCode}' topilmadi` 
            });
        }
    } catch (error) {
        res.json({ status: "error", message: "API xatosi", debug: error.message });
    }
});

app.listen(PORT, () => console.log('Server ishda!'));
