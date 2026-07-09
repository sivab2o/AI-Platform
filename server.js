// server.js
require('dotenv').config();

const express = require('express');
const app = express();
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // max 100 requests per IP
});
app.use(cors({
  origin: ['http://187.127.166.122', 'http://localhost:4200', 'http://localhost:3000','https://aiemployeeplatform.leadsfactory.info/login'],
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(helmet());
app.use('/api/', limiter);
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