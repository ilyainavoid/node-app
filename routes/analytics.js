const express = require('express');
const {
  cachedSummary,
  cachedUsage,
  cachedPopular,
  getHealth,
} = require('../services/analyticsService');

const router = express.Router();

router.get('/summary', async (req, res) => {
  try {
    const { cached, data } = await cachedSummary(req.query);
    data.metadata.cached = cached;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.toString() });
  }
});

router.get('/usage', async (req, res) => {
  try {
    const { cached, data } = await cachedUsage(req.query);
    data.metadata.cached = cached;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.toString() });
  }
});

router.get('/popular-content', async (req, res) => {
  try {
    const { cached, data } = await cachedPopular(req.query);
    data.metadata.cached = cached;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.toString() });
  }
});

router.get('/health', async (_req, res) => {
  try {
    const data = await getHealth();
    data.metadata.cached = false;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.toString() });
  }
});

module.exports = router;

