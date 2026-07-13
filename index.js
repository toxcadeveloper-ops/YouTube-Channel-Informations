const http = require('http');
const https = require('https');

const API_KEY = process.env.API_KEY; // Render'da Environment Variable sifatida qo'shing

const server = http.createServer((req, res) => {
    if (req.url.startsWith('/verify')) {
        // Yangi URL API dan foydalanamiz
        const myUrl = new URL(req.url, `http://${req.headers.host}`);
        const handle = myUrl.searchParams.get('handle');
        const userCode = myUrl.searchParams.get('code');

        if (!handle || !userCode) {
            res.end(JSON.stringify({ status: "error", message: "Params missing" }));
            return;
        }

        const cleanHandle = handle.trim().replace('@', '');
        // encodeURIComponent barcha maxsus belgilarni (bo'sh joy, @ va h.k.) xavfsiz qiladi
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(cleanHandle)}&maxResults=1&key=${API_KEY}`;
        
        https.get(searchUrl, (apiRes) => {
            let data = '';
            apiRes.on('data', (chunk) => data += chunk);
            apiRes.on('end', () => {
                try {
                    const search = JSON.parse(data);
                    if (!search.items || search.items.length === 0) {
                        res.end(JSON.stringify({ status: "error", message: "Kanal topilmadi" }));
                        return;
                    }

                    const channelId = search.items[0].snippet.channelId;
                    
                    https.get(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${API_KEY}`, (chRes) => {
                        let chData = '';
                        chRes.on('data', (c) => chData += c);
                        chRes.on('end', () => {
                            const channel = JSON.parse(chData);
                            const bio = channel.items[0]?.snippet?.description || "";

                            if (bio.includes(userCode)) {
                                res.end(JSON.stringify({ status: "success", message: "Tasdiqlandi!" }));
                            } else {
                                res.end(JSON.stringify({ status: "error", message: "Kodni bio-dan topa olmadim." }));
                            }
                        });
                    });
                } catch (e) {
                    res.end(JSON.stringify({ status: "error", message: "API Error" }));
                }
            });
        }).on('error', (err) => {
            res.end(JSON.stringify({ status: "error", message: err.message }));
        });
    }
});

server.listen(process.env.PORT || 3000);
