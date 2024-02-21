const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 4000;

// Enable CORS for all responses
app.use(cors({
  origin: '*' // This is for development. For production, specify trusted domains.
}));

// Middleware to validate network parameter
const validateNetwork = (req, res, next) => {
  const { network } = req.params;
  const allowedNetworks = ['kusama', 'polkadot'];
  if (!allowedNetworks.includes(network)) {
    return res.status(400).send('Invalid network specified');
  }
  next(); // Proceed to the next middleware/route handler if validation passes
};

// Dynamic route for fetching main data based on network
app.get('/api/:network', validateNetwork, async (req, res) => {
  const { network } = req.params;
  try {
    const beefy = await import('./beefy.mjs');
    const data = await beefy.main(network);
    res.json(data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Dynamic route for fetching status based on network
app.get('/api/:network/status', validateNetwork, async (req, res) => {
  const { network } = req.params;
  try {
    const beefy = await import('./beefy.mjs');
    const data = await beefy.status(beefy.globalCache, network);
    res.json(data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});
