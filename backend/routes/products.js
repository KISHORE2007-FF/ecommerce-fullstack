const router = require('express').Router();
const db = require('../database');
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
  res.json(products);
});

router.post('/', authenticate, adminOnly, (req, res) => {
  const { name, description = '', price, image = '', stock = 0 } = req.body;
  if (!name || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0)
    return res.status(400).json({ message: 'Enter a product name, valid price and non-negative whole-number stock.' });
  const result = db.prepare('INSERT INTO products (name, description, price, image, stock) VALUES (?, ?, ?, ?, ?)')
    .run(name.trim(), description, Number(price), image, Number(stock));
  res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', authenticate, adminOnly, (req, res) => {
  const { name, description = '', price, image = '', stock = 0 } = req.body;
  if (!name || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0)
    return res.status(400).json({ message: 'Invalid product details.' });
  const result = db.prepare('UPDATE products SET name=?, description=?, price=?, image=?, stock=? WHERE id=?')
    .run(name.trim(), description, Number(price), image, Number(stock), req.params.id);
  if (!result.changes) return res.status(404).json({ message: 'Product not found.' });
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
});

router.delete('/:id', authenticate, adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ message: 'Product not found.' });
  res.json({ message: 'Product deleted.' });
});

module.exports = router;
