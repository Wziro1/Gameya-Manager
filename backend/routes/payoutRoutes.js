const express = require('express');
const { sendPayout, respondToPayout, getProof } = require('../controllers/payoutController');
const { protect } = require('../middleware/authMiddleware');
const { uploadReceipt } = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.post('/', uploadReceipt, sendPayout);
router.patch('/:id/respond', respondToPayout);
router.get('/:id/proof', getProof);

module.exports = router;