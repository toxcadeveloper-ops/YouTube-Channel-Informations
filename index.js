const axios = require('axios');
const http = require('http');

const API_KEY = process.env.API_KEY; // Render'ga o'tkazing!

const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/verify')) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const handle = url.searchParams.get('handle')?.replace('@', '').trim();
        const code = url.searchParams.get('code');

        try {
            const search = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&maxResults=1&key=${API_KEY}`);
            const channelId = search.data.items[0].snippet.channelId;
            const channel = await axios.get(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${API_KEY}`);
            
            const bio = channel.data.items[0].snippet.description || "";
            if (bio.includes(code)) {
                res.end(JSON.stringify({ status: "success" }));
            } else {
                res.end(JSON.stringify({ status: "error", message: "Kodni topa olmadim" }));
            }
        } catch (e) {
            res.end(JSON.stringify({ status: "error", message: "API xatosi" }));
        }
    }
});
server.listen(3000);
