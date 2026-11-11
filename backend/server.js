require('dotenv').config();
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy .env.example to .env and set a secret.');
  process.exit(1);
}
const express = require('express');
const cors = require('cors');
const path = require('path');
require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'E-Commerce API is running.' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`E-Commerce app running at http://localhost:${PORT}`));
