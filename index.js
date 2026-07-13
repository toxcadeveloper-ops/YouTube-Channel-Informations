const http = require('http');
const https = require('https');
const url = require('url');

const API_KEY = process.env.API_KEY;

const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);
    
    // 1. Kanalni verifikatsiya qilish va statistika olish
    if (parsed.pathname === '/verify') {
        const { channelId, code } = parsed.query;
        
        // Kanalni topish va statistikani olish
        https.get(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${API_KEY}`, (apiRes) => {
            let data = '';
            apiRes.on('data', (c) => data += c);
            apiRes.on('end', async () => {
                const json = JSON.parse(data);
                if (!json.items || !json.items[0].snippet.description.includes(code)) {
                    return res.end(JSON.stringify({ status: "error" }));
                }

                // Oxirgi videoni olish uchun search
                https.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=1&order=date&type=video&key=${API_KEY}`, (vRes) => {
                    let vData = '';
                    vRes.on('data', (c) => vData += c);
                    vRes.on('end', async () => {
                        const video = JSON.parse(vData).items[0];
                        // Video statistikasini olish (views, likes)
                        https.get(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${video.id.videoId}&key=${API_KEY}`, (sRes) => {
                            let sData = '';
                            sRes.on('data', (c) => sData += c);
                            sRes.on('end', () => {
                                const stats = JSON.parse(sData).items[0].statistics;
                                res.end(JSON.stringify({ 
                                    status: "success", 
                                    channelStats: json.items[0].statistics,
                                    lastVideoStats: stats 
                                }));
                            });
                        });
                    });
                });
            });
        }).on('error', () => res.end(JSON.stringify({ status: "error" })));
    }
});
server.listen(3000);
// index.js
server.on('request', (req, res) => {
    console.log("Roblox'dan so'rov keldi! URL:", req.url); // Bu Render logida chiqishi shart!
});
