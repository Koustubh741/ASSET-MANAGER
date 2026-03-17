const http = require('http');
const fs = require('fs');

const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/api/v1/software/discovered',
    method: 'GET',
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const jsonData = JSON.parse(data);
            fs.writeFileSync('node_api_result.txt', `✅ Success! API returned ${jsonData.length} items.\nFirst 3 items:\n${JSON.stringify(jsonData.slice(0, 3), null, 2)}`);
        } catch (e) {
            fs.writeFileSync('node_api_result.txt', `⚠️ Response received but not valid JSON. Status: ${res.statusCode}\nData: ${data.substring(0, 200)}...`);
        }
    });
});

req.on('error', (e) => {
    fs.writeFileSync('node_api_result.txt', `❌ Connection Error: ${e.message}`);
});
req.end();
