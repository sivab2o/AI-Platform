// const mysql = require('mysql2');

// const db = mysql.createPool({
//   host: 'localhost',
//   user: 'u201043032_ai_admin',
//   password: 'Ai_platform@123',
//   database: 'u201043032_ai_platform',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

// db.getConnection((err, connection) => {
//   if (err) {
//     console.error('Database connection failed: ' + err.stack);
//     return;
//   }
//   console.log('Connected to VPS MySQL Database (pool)');
//   connection.release();
// });

// module.exports = db;


const mysql = require('mysql2');

// ✅ Local MySQL credentials
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ai_employee'
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }
});

module.exports = db;
