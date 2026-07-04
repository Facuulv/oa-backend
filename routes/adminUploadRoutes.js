const express = require('express');
const router = express.Router();
const adminUploadController = require('../controllers/adminUploadController');
const { uploadSingleImage } = require('../middlewares/uploadImageMiddleware');

router.post('/', uploadSingleImage, adminUploadController.uploadImagen);

module.exports = router;
