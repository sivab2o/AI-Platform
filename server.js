// server.js
require('dotenv').config(); // ✅ First line

const express = require('express');
const app = express();
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');


app.use(cors());
app.use(express.json());   // ✅ IMPORTANT
// Use the routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});