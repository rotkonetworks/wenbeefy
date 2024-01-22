const express = require('express');

const app = express();
const port = process.env.PORT || 4000; // Use environment variable for port

app.get('/api', async (req, res) => {
    try {
        // Use dynamic import for ES Modules
        const beefy = await import('./beefy.mjs');
        const data = await beefy.main(beefy.globalCache); // Pass the globalCache to main
        res.json(data);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get('/api/status', async (req, res) => {
    try {
        const beefy = await import('./beefy.mjs');
        const data = await beefy.status(beefy.globalCache);
        res.json(data);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.listen(port, () => {
    console.log(`API server running at http://0.0.0.0:${port}`);
});
