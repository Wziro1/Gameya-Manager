const express = require('express');
const { getMyTrust, getRules } = require('../controllers/trustController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/me', getMyTrust);
router.get('/rules', getRules);

module.exports = router;