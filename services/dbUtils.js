const db = require('../db');

function escapeValue(value) {
  if (db.connection && typeof db.connection.escape === 'function') {
    return db.connection.escape(value);
  }
  return `'${value ?? ''}'`;
}

function query(sql) {
  return new Promise((resolve, reject) => {
    db.connection.query(sql, (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

module.exports = {
  escapeValue,
  query,
};

