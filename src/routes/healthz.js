const express = require('express');
const router = express.Router();

//https://medium.com/better-programming/how-to-add-a-health-check-to-your-node-js-app-5154d13b969e
router.get('/', async (req, res) => {
  const healthz = {
    uptime: process.uptime(),
    message: 'I am healthy',
    timestamp: Date.now()
  }
  try {
    res.status(200).send(healthz);

  } catch (e) {
    healthz.message = e;
    res.status(503).send();

  }


});

module.exports = router;