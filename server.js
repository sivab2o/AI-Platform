// server.js
require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const helmet = require('helmet');
// ✅ Generous per-IP limit — real users never hit this, spam bots do
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,   // 1 minute window
    max: 60,               // 60 requests per minute per customer IP
    standardHeaders: true,
    legacyHeaders: false
});
app.set('trust proxy', 1);   // ✅ Behind Nginx — get real customer IP, not Nginx's IP
app.use('/api/ai', aiLimiter);

app.use(cors({
  origin: ['http://187.127.166.122', 'http://localhost:4200', 'http://localhost:3000','https://aiemployeeplatform.leadsfactory.info/login'],
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(helmet());

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname,'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/', (req, res) => { res.send('AI Employee Backend Running'); });

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});