const express = require('express');
const router = express.Router();
const { saveImage, getAllImages } = require('../services/imageService');

const IMAGE_FIELD = 'image';
const MSG_IMAGE_REQUIRED = 'image required';

function getImageFile(req) {
    return req.files && req.files[IMAGE_FIELD] ? req.files[IMAGE_FIELD] : null;
}

/* GET index page */
router.get('/', function (req, res) {
    res.render('index', { title: 'PhotoGallery', version: '0.1.0' });
});

/* POST new image */
router.post('/new', async function (req, res, next) {
    const imageFile = getImageFile(req);
    console.log('Request fields:', req.body);
    console.log('Request files:', req.files ? Object.getOwnPropertyNames(req.files) : []);

    if (!imageFile) {
        return res.status(400).json({
            error: MSG_IMAGE_REQUIRED
        });
    }

    try {
        const startedAt = Date.now();
        const fileName = await saveImage({
            file: imageFile,
            name: req.body['name'],
            description: req.body['description'],
            author: req.body['author']
        });
        return res.json({
            timestamp: new Date().toISOString(),
            data: {
                fileName: fileName
            },
            metadata: {
                generated_in_ms: Date.now() - startedAt
            }
        });
    } catch (err) {
        return res.status(500).json({
            error: err.toString()
        });
    }
});

/* GET all images */
router.get('/all', async function (req, res, next) {
    try {
        const startedAt = Date.now();
        const rows = await getAllImages();
        res.json({
            timestamp: new Date().toISOString(),
            data: {
                items: rows,
                total: rows.length
            },
            metadata: {
                generated_in_ms: Date.now() - startedAt
            }
        });
    } catch (err) {
        return res.status(500).json({
            error: err.toString()
        });
    }
});

module.exports = router;
