const http = require('http');
const https = require('https');

const API_KEY = process.env.API_KEY; 

const server = http.createServer((req, res) => {
    if (req.url.startsWith('/verify')) {
        const myUrl = new URL(req.url, `http://${req.headers.host}`);
        const channelId = myUrl.searchParams.get('channelId');
        const code = myUrl.searchParams.get('code');

        if (!channelId || !code) return res.end(JSON.stringify({ status: "error" }));

        https.get(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${API_KEY}`, (apiRes) => {
            let data = '';
            apiRes.on('data', (c) => data += c);
            apiRes.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const channel = json.items[0];
                    if (channel && channel.snippet.description.includes(code)) {
                        res.end(JSON.stringify({ status: "success", stats: channel.statistics }));
                    } else {
                        res.end(JSON.stringify({ status: "error", message: "Kod topilmadi" }));
                    }
                } catch { res.end(JSON.stringify({ status: "error" })); }
            });
        }).on('error', () => res.end(JSON.stringify({ status: "error" })));
    }
});
server.listen(3000);
