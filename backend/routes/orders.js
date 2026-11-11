const router = require('express').Router();
const db = require('../database');
const { authenticate, adminOnly } = require('../middleware/auth');

router.post('/', authenticate, (req, res) => {
  const { items, address } = req.body;
  if (!Array.isArray(items) || items.length === 0 || !address?.trim())
    return res.status(400).json({ message: 'Your cart and delivery address are required.' });

  const createOrder = db.transaction(() => {
    let total = 0;
    const lines = [];
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Invalid quantity.');
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(item.productId));
      if (!product) throw new Error('A product in your cart no longer exists.');
      if (product.stock < quantity) throw new Error(`${product.name} does not have enough stock.`);
      total += product.price * quantity;
      lines.push({ product, quantity });
    }
    const order = db.prepare('INSERT INTO orders (user_id, total, address) VALUES (?, ?, ?)')
      .run(req.user.id, total, address.trim());
    const addLine = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)');
    const reduceStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    lines.forEach(({ product, quantity }) => {
      addLine.run(order.lastInsertRowid, product.id, product.name, quantity, product.price);
      reduceStock.run(quantity, product.id);
    });
    return order.lastInsertRowid;
  });

  try {
    const orderId = createOrder();
    res.status(201).json({ message: 'Order placed successfully.', orderId });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/my', authenticate, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  const getItems = db.prepare('SELECT product_name, quantity, price FROM order_items WHERE order_id = ?');
  res.json(orders.map(order => ({ ...order, items: getItems.all(order.id) })));
});

router.get('/', authenticate, adminOnly, (req, res) => {
  const orders = db.prepare(`SELECT orders.*, users.name AS customer_name, users.email AS customer_email
    FROM orders JOIN users ON users.id = orders.user_id ORDER BY orders.id DESC`).all();
  const getItems = db.prepare('SELECT product_name, quantity, price FROM order_items WHERE order_id = ?');
  res.json(orders.map(order => ({ ...order, items: getItems.all(order.id) })));
});

router.patch('/:id/status', authenticate, adminOnly, (req, res) => {
  const allowed = ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid order status.' });
  const result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  if (!result.changes) return res.status(404).json({ message: 'Order not found.' });
  res.json({ message: 'Order status updated.' });
});

module.exports = router;
