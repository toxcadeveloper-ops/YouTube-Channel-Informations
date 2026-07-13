const http = require('http');
const https = require('https');
const url = require('url');

const API_KEY = 'SIZNING_API_KEYINGIZ'; // Bu yerga o'z kalitingizni qo'ying

const server = http.createServer((req, res) => {
    // Faqat /verify yo'li uchun javob beramiz
    if (req.url.startsWith('/verify')) {
        const query = url.parse(req.url, true).query;
        let handle = query.handle;
        const userCode = query.code;

        if (!handle || !userCode) {
            res.end(JSON.stringify({ status: "error", message: "Params missing" }));
            return;
        }

        // Handle ni tozalash
        handle = handle.trim().replace('@', '');

        // 1. YouTube API orqali kanalni qidirish
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&maxResults=1&key=${API_KEY}`;
        
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

                    // 2. Kanal bio'sini olish
                    https.get(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${API_KEY}`, (chRes) => {
                        let chData = '';
                        chRes.on('data', (c) => chData += c);
                        chRes.on('end', () => {
                            const channel = JSON.parse(chData);
                            const bio = channel.items[0]?.snippet?.description || "";

                            // 3. Kodni tekshirish
                            if (bio.includes(userCode)) {
                                res.end(JSON.stringify({ status: "success", message: "Kanal tasdiqlandi!" }));
                            } else {
                                res.end(JSON.stringify({ status: "error", message: "Kodni bio-dan topa olmadim." }));
                            }
                        });
                    });
                } catch (e) {
                    res.end(JSON.stringify({ status: "error", message: "JSON parse xatosi" }));
                }
            });
        }).on('error', (err) => {
            res.end(JSON.stringify({ status: "error", message: err.message }));
        });
    } else {
        res.end('Server ishlamoqda...');
    }
});

server.listen(process.env.PORT || 3000);
