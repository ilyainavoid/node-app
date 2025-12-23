const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { escapeValue, query } = require('./dbUtils');
const { clearAnalyticsCache } = require('./analyticsService');

const PUBLIC_IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');
const MSG_IMAGE_REQUIRED = 'image required';

function streamToBuffer(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function saveImage({ file, name, description, author }) {
  if (!file) {
    throw new Error(MSG_IMAGE_REQUIRED);
  }

  const extension = path.extname(file.path) || '';
  const fileName = uuidv4() + extension;
  const data = await streamToBuffer(file);

  ensureImagesDir();
  fs.writeFileSync(path.join(PUBLIC_IMAGES_DIR, fileName), data);

  const escapedName = escapeValue(name);
  const escapedDescription = escapeValue(description);
  const escapedAuthor = escapeValue(author);
  const escapedPath = escapeValue(fileName);

  const insertSql = `INSERT INTO data (name, description, author, path) 
                     VALUES (${escapedName}, ${escapedDescription}, ${escapedAuthor}, ${escapedPath});`;

  await query(insertSql);
  clearAnalyticsCache();
  return fileName;
}

async function getAllImages() {
  return query('SELECT * from data');
}

function ensureImagesDir() {
  if (!fs.existsSync(PUBLIC_IMAGES_DIR)) {
    fs.mkdirSync(PUBLIC_IMAGES_DIR, { recursive: true });
  }
}

module.exports = {
  saveImage,
  getAllImages,
};

