# SIMS API Documentation

Base URL: `/api`

All protected routes require a valid JWT session (NextAuth cookie).

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/forgot-password` | Request password reset token |
| POST | `/auth/reset-password` | Reset password with token |
| * | `/auth/[...nextauth]` | NextAuth handlers (login, session) |

### Register Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123",
  "confirmPassword": "secret123",
  "role": "SALES_STAFF"
}
```

## Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/stats` | Dashboard statistics |
| GET | `/dashboard/charts` | Chart data |
| GET | `/dashboard/activities` | Recent audit logs |

## Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories?page=1&limit=10&search=` | List categories |
| POST | `/categories` | Create category |
| GET | `/categories/:id` | Get category |
| PUT | `/categories/:id` | Update category |
| DELETE | `/categories/:id` | Delete category |

## Suppliers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/suppliers` | List suppliers (paginated) |
| POST | `/suppliers` | Create supplier |
| GET | `/suppliers/:id` | Get supplier |
| PUT | `/suppliers/:id` | Update supplier |
| DELETE | `/suppliers/:id` | Delete supplier |

## Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products?search=&categoryId=&status=` | List products |
| POST | `/products` | Create product |
| GET | `/products/:id` | Get product |
| PUT | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |

## Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/inventory` | Transaction history |
| POST | `/inventory` | Stock in/out/adjustment |
| GET | `/inventory/low-stock` | Low stock products |

### Inventory Transaction Body
```json
{
  "productId": "cuid",
  "type": "STOCK_IN",
  "quantity": 10,
  "reason": "Restock"
}
```

## Purchase Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/purchase-orders` | List orders |
| POST | `/purchase-orders` | Create order |
| GET | `/purchase-orders/:id` | Get order |
| POST | `/purchase-orders/:id/approve` | Approve order |
| POST | `/purchase-orders/:id/reject` | Reject order |
| POST | `/purchase-orders/:id/receive` | Receive stock |

## Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customers` | List customers |
| POST | `/customers` | Create customer |
| GET | `/customers/:id` | Get customer |
| PUT | `/customers/:id` | Update customer |
| DELETE | `/customers/:id` | Delete customer |

## Sales

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sales` | List sales |
| POST | `/sales` | Create sale (auto stock reduction) |
| GET | `/sales/:id` | Get sale with invoice details |

## Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/inventory` | Inventory report |
| GET | `/reports/sales?from=&to=` | Sales report |
| GET | `/reports/purchases` | Purchase report |
| GET | `/reports/suppliers` | Supplier report |

## Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings` | Company settings |
| PUT | `/settings` | Update settings |
| GET | `/settings/profile` | User profile |
| PUT | `/settings/profile` | Update profile |

## Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | User notifications |
| PUT | `/notifications` | Mark notifications read |
| GET | `/audit-logs` | Audit log history |
| POST | `/upload` | Upload product image |

## Response Format

```json
{
  "success": true,
  "data": {},
  "message": "Optional message"
}
```

Paginated responses include: `total`, `page`, `limit`, `totalPages`.

Error responses:
```json
{
  "success": false,
  "error": "Error message"
}
```
