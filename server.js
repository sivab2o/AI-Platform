// server.js
require('dotenv').config();

const express = require('express');
const app = express();
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/', (req, res) => { res.send('AI Employee Backend Running'); });
const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});