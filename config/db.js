const mysql = require('mysql2');

// const db = mysql.createConnection({
//   host: 'localhost',
//   user: 'u201043032_ai_admin',
//   password: 'YOUR_HOSTINGER_PASSWORD',
//   database: 'u201043032_ai_employee_platform'
// });

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

  console.log('Connected to MySQL Database');
});

module.exports = db;