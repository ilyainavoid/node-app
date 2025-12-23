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
        return res.status(400).send(MSG_IMAGE_REQUIRED);
    }

    try {
        const fileName = await saveImage({
            file: imageFile,
            name: req.body['name'],
            description: req.body['description'],
            author: req.body['author']
        });
        return res.send(fileName);
    } catch (err) {
        return res.status(500).send(err.toString());
    }
});

/* GET all images */
router.get('/all', async function (req, res, next) {
    try {
        const rows = await getAllImages();
        res.send(rows);
    } catch (err) {
        return res.status(500).send(err.toString());
    }
});

module.exports = router;
