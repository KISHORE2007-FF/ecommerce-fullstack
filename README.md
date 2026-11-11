# ShopEase – Full-Stack E-Commerce Application

A beginner-friendly online store built with **HTML, CSS, JavaScript, Node.js, Express, SQLite, JWT and bcrypt**.

## Features
- Product catalog with search and stock display
- Shopping cart and checkout (Cash on Delivery demo)
- User registration and login
- Role-based access: User and Admin
- Admin product create, edit and delete
- Customer order history and order tracking
- Admin order list and status updates
- SQLite database created automatically

## Requirements
- Node.js 18 or later
- npm

## Run on Windows
1. Extract the project ZIP.
2. Open the extracted `ecommerce-fullstack` folder in VS Code.
3. Open Terminal in that folder.
4. Install packages:
   ```bash
   npm install
   ```
5. Create a file named `.env` in the root folder. Copy the values from `.env.example` and set a private secret:
   ```env
   PORT=5000
   JWT_SECRET=your_private_long_random_secret
   ```
6. Start the server:
   ```bash
   npm run dev
   ```
   Or use `npm start`.
7. Open **http://localhost:5000** in your browser.

The database file `backend/shop.db` and demo products are created automatically on first run.

## Demo Admin
- Email: `admin@shop.com`
- Password: `Admin123!`

Log in with this account to open the Admin page, manage products and update order statuses. Register a normal account to shop and place orders.

## API endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create user account |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| GET | `/api/products` | Public | List products |
| POST | `/api/products` | Admin | Add product |
| PUT | `/api/products/:id` | Admin | Update product |
| DELETE | `/api/products/:id` | Admin | Delete product |
| POST | `/api/orders` | User | Place order |
| GET | `/api/orders/my` | User | View own orders |
| GET | `/api/orders` | Admin | View all orders |
| PATCH | `/api/orders/:id/status` | Admin | Update order status |

Protected endpoints use this header:
`Authorization: Bearer YOUR_JWT_TOKEN`

## Project structure

```text
ecommerce-fullstack/
├── backend/
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   └── orders.js
│   ├── database.js
│   └── server.js
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Notes
- This is a learning/demo project. Checkout records an order and reduces stock; it does not process real payments.
- The admin credentials are for local demonstration. Change the password and JWT secret before any public deployment.
- Product images use remote image URLs; a placeholder appears if an image cannot load.
