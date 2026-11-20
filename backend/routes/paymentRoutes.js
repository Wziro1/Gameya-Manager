const express = require('express');
const {
  submitPayment,
  getPendingPayments,
  reviewPayment,
  getReceipt,
  getLedger,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { uploadReceipt } = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.post('/', uploadReceipt, submitPayment);
router.get('/circle/:circleId/pending', getPendingPayments);
router.get('/circle/:circleId/ledger', getLedger);
router.patch('/:id/review', reviewPayment);
router.get('/:id/receipt', getReceipt);

module.exports = router;