const express = require('express');
const {
  createCircle,
  joinCircle,
  getMyCircles,
  getJoinedCircles,
  getCircleById,
  respondToJoinRequest,
  startCircle,
} = require('../controllers/circleController');
const { protect } = require('../middleware/authMiddleware');



const router = express.Router();

router.use(protect); // every circle route requires login

router.post('/', createCircle);
router.post('/join', joinCircle);
router.get('/my', getMyCircles);
router.get('/joined', getJoinedCircles);
router.get('/:id', getCircleById);
router.patch('/:id/participants/:userId', respondToJoinRequest);
router.post('/:id/start', startCircle);

module.exports = router;