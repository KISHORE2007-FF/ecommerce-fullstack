const API = '/api';
let token = localStorage.getItem('token') || '';
let user = JSON.parse(localStorage.getItem('user') || 'null');
let products = [];
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
const $ = s => document.querySelector(s);
const money = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(API + path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}
function toast(message) { const el = $('#toast'); el.textContent = message; el.style.display = 'block'; setTimeout(() => el.style.display = 'none', 2800); }
function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); $('#cart-count').textContent = cart.reduce((n, i) => n + i.quantity, 0); }
function updateHeader() {
  $('#user-label').textContent = user ? `Hi, ${user.name}` : '';
  $('#auth-button').textContent = user ? 'Logout' : 'Login';
  $('#admin-link').hidden = user?.role !== 'admin';
  document.querySelectorAll('.auth-link').forEach(a => a.hidden = !user);
}
function safeImage(url) { return url || 'https://placehold.co/600x400?text=Product'; }

async function loadProducts() {
  try {
    products = await api('/products');
    renderProducts(products);
  } catch (e) { toast(e.message); }
}
function renderProducts(list) {
  $('#product-grid').innerHTML = list.length ? list.map(p => `
    <article class="product-card">
      <img src="${safeImage(escapeHtml(p.image))}" alt="${escapeHtml(p.name)}" onerror="this.src='https://placehold.co/600x400?text=Product'">
      <div class="product-info"><h3>${escapeHtml(p.name)}</h3><p class="muted">${escapeHtml(p.description || '')}</p>
      <div class="price-row"><span class="price">${money(p.price)}</span><button class="btn small-btn" onclick="addToCart(${p.id})" ${p.stock < 1 ? 'disabled' : ''}>${p.stock < 1 ? 'Out of stock' : 'Add to cart'}</button></div>
      <p class="muted">${p.stock} in stock</p></div></article>`).join('') : '<p>No products found.</p>';
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function addToCart(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  const line = cart.find(x => x.productId === id);
  if (line) { if (line.quantity >= p.stock) return toast('Maximum available stock reached.'); line.quantity++; }
  else cart.push({ productId: id, quantity: 1 });
  saveCart(); toast('Added to cart.');
}
function showModal(html) { $('#modal-content').innerHTML = html; $('#modal').hidden = false; }
function closeModal() { $('#modal').hidden = true; }
function authModal(mode = 'login') {
  const register = mode === 'register';
  showModal(`<h2>${register ? 'Create account' : 'Welcome back'}</h2><form id="auth-form">
    ${register ? '<input name="name" placeholder="Full name" required>' : ''}
    <input name="email" type="email" placeholder="Email address" required>
    <input name="password" type="password" placeholder="Password (min. 6 characters)" required>
    <button class="btn">${register ? 'Register' : 'Login'}</button>
    <p class="muted">${register ? 'Already have an account?' : 'New to ShopEase?'} <a href="#" id="switch-auth">${register ? 'Login' : 'Create an account'}</a></p>
    ${!register ? '<p class="muted">Demo admin: admin@shop.com / Admin123!</p>' : ''}</form>`);
  $('#switch-auth').onclick = e => { e.preventDefault(); authModal(register ? 'login' : 'register'); };
  $('#auth-form').onsubmit = async e => {
    e.preventDefault(); const body = Object.fromEntries(new FormData(e.target));
    try {
      if (register) { await api('/auth/register', { method: 'POST', body: JSON.stringify(body) }); toast('Account created. Please log in.'); authModal('login'); }
      else { const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(body) }); token = result.token; user = result.user; localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); updateHeader(); closeModal(); toast('Logged in successfully.'); }
    } catch (err) { toast(err.message); }
  };
}
function cartModal() {
  const lines = cart.map(line => ({ ...line, product: products.find(p => p.id === line.productId) })).filter(x => x.product);
  const total = lines.reduce((sum, x) => sum + x.product.price * x.quantity, 0);
  showModal(`<h2>Your cart</h2>${lines.length ? lines.map(x => `<div class="cart-item"><div><b>${escapeHtml(x.product.name)}</b><p class="muted">${money(x.product.price)} × ${x.quantity}</p></div><div><b>${money(x.product.price*x.quantity)}</b><p><button class="btn btn-outline small-btn" onclick="changeQty(${x.productId},-1)">−</button> <button class="btn btn-outline small-btn" onclick="changeQty(${x.productId},1)">+</button></p></div></div>`).join('') : '<p class="muted">Your cart is empty.</p>'}
  <h3>Total: ${money(total)}</h3>${lines.length ? `<button class="btn" id="checkout-btn">Proceed to checkout</button>` : ''}`);
  const checkout = $('#checkout-btn'); if (checkout) checkout.onclick = () => { if (!user) return authModal(); checkoutModal(lines, total); };
}
window.changeQty = (id, amount) => {
  const line = cart.find(x => x.productId === id); const p = products.find(x => x.id === id);
  if (!line || !p) return;
  line.quantity += amount;
  if (line.quantity < 1) cart = cart.filter(x => x.productId !== id);
  if (line.quantity > p.stock) { line.quantity = p.stock; toast('Maximum available stock reached.'); }
  saveCart(); cartModal();
};
function checkoutModal(lines, total) {
  showModal(`<h2>Delivery details</h2><p class="muted">Order total: ${money(total)}</p><form id="checkout-form"><textarea name="address" placeholder="Full delivery address" rows="4" required></textarea><button class="btn">Place order (Cash on Delivery)</button></form>`);
  $('#checkout-form').onsubmit = async e => {
    e.preventDefault();
    try {
      const result = await api('/orders', { method: 'POST', body: JSON.stringify({ address: new FormData(e.target).get('address'), items: lines.map(x => ({ productId: x.productId, quantity: x.quantity })) }) });
      cart = []; saveCart(); closeModal(); toast(`Order #${result.orderId} placed!`); await loadProducts(); renderPage('orders');
    } catch (err) { toast(err.message); }
  };
}
async function renderPage(page) {
  const area = $('#page-content'); area.hidden = false; $('#products').hidden = page !== 'home'; area.innerHTML = '<p>Loading...</p>';
  if (page === 'home') { area.hidden = true; return; }
  if (!user) { area.innerHTML = '<div class="panel"><h2>Please log in</h2><button class="btn" id="page-login">Login</button></div>'; $('#page-login').onclick = () => authModal(); return; }
  if (page === 'orders') {
    try {
      const orders = await api('/orders/my');
      area.innerHTML = `<h2>My orders</h2>${orders.length ? orders.map(o => `<div class="panel"><div class="price-row"><h3>Order #${o.id}</h3><span class="status">${escapeHtml(o.status)}</span></div><p class="muted">${new Date(o.created_at + 'Z').toLocaleString()}</p>${o.items.map(i => `<div class="order-item"><span>${escapeHtml(i.product_name)} × ${i.quantity}</span><b>${money(i.price*i.quantity)}</b></div>`).join('')}<h3>Total: ${money(o.total)}</h3><p class="muted">Delivery: ${escapeHtml(o.address)}</p></div>`).join('') : '<p class="muted">You have not placed any orders yet.</p>'}`;
    } catch (e) { area.innerHTML = `<p>${escapeHtml(e.message)}</p>`; }
  } else if (page === 'admin') {
    if (user.role !== 'admin') { area.innerHTML = '<p>Admin access required.</p>'; return; }
    await renderAdmin(area);
  }
}
async function renderAdmin(area) {
  try {
    const [allProducts, orders] = await Promise.all([api('/products'), api('/orders')]);
    area.innerHTML = `<div class="price-row"><div><p class="eyebrow">STORE MANAGEMENT</p><h2>Admin dashboard</h2></div><button class="btn" id="add-product">Add product</button></div>
    <h3>Products</h3><div class="table-wrap"><table><thead><tr><th>Name</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>${allProducts.map(p => `<tr><td>${escapeHtml(p.name)}</td><td>${money(p.price)}</td><td>${p.stock}</td><td><button class="btn btn-outline small-btn" onclick="editProduct(${p.id})">Edit</button> <button class="btn btn-outline small-btn" onclick="deleteProduct(${p.id})">Delete</button></td></tr>`).join('')}</tbody></table></div>
    <h3>Customer orders</h3>${orders.length ? orders.map(o => `<div class="panel"><div class="price-row"><b>Order #${o.id} — ${escapeHtml(o.customer_name)} (${escapeHtml(o.customer_email)})</b><b>${money(o.total)}</b></div><p class="muted">${o.items.map(i => `${escapeHtml(i.product_name)} × ${i.quantity}`).join(', ')}</p><div class="price-row"><span class="status">${escapeHtml(o.status)}</span><select onchange="updateStatus(${o.id},this.value)">${['Placed','Processing','Shipped','Delivered','Cancelled'].map(s => `<option ${s===o.status?'selected':''}>${s}</option>`).join('')}</select></div></div>`).join('') : '<p class="muted">No orders yet.</p>'}`;
    $('#add-product').onclick = () => productForm();
  } catch (e) { area.innerHTML = `<p>${escapeHtml(e.message)}</p>`; }
}
function productForm(p = null) {
  showModal(`<h2>${p ? 'Edit product' : 'Add product'}</h2><form id="product-form">
    <input name="name" placeholder="Product name" value="${escapeHtml(p?.name || '')}" required>
    <textarea name="description" placeholder="Description" rows="3">${escapeHtml(p?.description || '')}</textarea>
    <input name="price" type="number" min="0" step="0.01" placeholder="Price" value="${p?.price ?? ''}" required>
    <input name="stock" type="number" min="0" step="1" placeholder="Stock quantity" value="${p?.stock ?? 0}" required>
    <input name="image" placeholder="Image URL (optional)" value="${escapeHtml(p?.image || '')}">
    <button class="btn">${p ? 'Save changes' : 'Add product'}</button></form>`);
  $('#product-form').onsubmit = async e => {
    e.preventDefault(); const body = Object.fromEntries(new FormData(e.target));
    try { await api('/products' + (p ? '/' + p.id : ''), { method: p ? 'PUT' : 'POST', body: JSON.stringify(body) }); closeModal(); toast('Product saved.'); renderPage('admin'); loadProducts(); }
    catch (err) { toast(err.message); }
  };
}
window.editProduct = async id => { const p = products.find(x => x.id === id) || (await api('/products')).find(x => x.id === id); productForm(p); };
window.deleteProduct = async id => { if (!confirm('Delete this product?')) return; try { await api('/products/' + id, { method: 'DELETE' }); toast('Product deleted.'); await loadProducts(); renderPage('admin'); } catch (e) { toast(e.message); } };
window.updateStatus = async (id, status) => { try { await api('/orders/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) }); toast('Order status updated.'); } catch (e) { toast(e.message); } };

$('#auth-button').onclick = () => {
  if (!user) authModal();
  else { token = ''; user = null; localStorage.removeItem('token'); localStorage.removeItem('user'); updateHeader(); toast('Logged out.'); renderPage('home'); }
};
$('#cart-open').onclick = cartModal;
$('#modal-close').onclick = closeModal;
$('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
document.querySelectorAll('[data-page]').forEach(a => a.onclick = e => { e.preventDefault(); renderPage(a.dataset.page); window.scrollTo({ top: 0, behavior: 'smooth' }); });
$('#search').oninput = e => renderProducts(products.filter(p => (p.name + ' ' + p.description).toLowerCase().includes(e.target.value.toLowerCase())));
updateHeader(); saveCart(); loadProducts();
