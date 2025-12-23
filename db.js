const mysql = require('mysql');
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'mysql',
    password: process.env.DB_PASSWORD || 'mysql',
    database: process.env.DB_NAME || 'db'
});

module.exports = { connection };
