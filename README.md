# ProSystem Frontend

A modern, cloud-based multi-tenant SaaS Point of Sale (POS) frontend built with Vue.js 3, TypeScript, and PrimeVue. Each business (tenant) operates in complete isolation with its own data, configuration, and branding.

## Tech Stack

| Technology             | Version          | Purpose                               |
| ---------------------- | ---------------- | ------------------------------------- |
| Vue.js                 | 3.x              | Frontend framework (Composition API)  |
| TypeScript             | 5.x              | Type safety throughout                |
| Vite                   | 8.x              | Build tool & dev server               |
| Vue Router             | 5.x              | Client-side routing with route guards |
| Pinia                  | 3.x              | Auth store, shop store                |
| PrimeVue               | 4.x (Aura theme) | UI component library                  |
| Axios                  | 1.16.1           | HTTP client with interceptors         |
| Chart.js + vue-chartjs | latest           | Reports & analytics charts            |
| Nginx                  | Alpine           | Production web server                 |
| Docker                 | v28+             | Containerized deployment              |

## Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- ProSystem Backend running on `http://localhost:5000`

## Getting Started

```bash
# Clone the repository
git clone https://github.com/Thisara_Chamika/prosystem-frontend.git

# Navigate into the project
cd prosystem-frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Deployment

### Vercel (Production)

The frontend is deployed on **Vercel** and connected to the GitHub repository.

- **Production URL:** `https://prosystem-frontend-beryl.vercel.app/`
- Production deploys automatically from the `main` branch
- Preview deployments are created automatically for every feature branch

### Docker (Local / Self-Hosted)

```bash
# Build and run with Docker Compose
docker-compose up --build -d

# The app will be available at http://localhost
```

The Docker setup uses a multi-stage build — Vite builds the app, then Nginx Alpine serves the static files on port 80.

## Project Structure

```
src/
├── assets/               # Global CSS variables, base styles
├── components/
│   └── layout/           # AppTopbar, AppSidebar, AppLayout
├── views/
│   ├── auth/             # Login
│   ├── customers/        # Customer management
│   ├── dashboard/        # Owner, manager, cashier dashboards
│   ├── inventory/        # Stock management
│   ├── onboarding/       # Multi-step onboarding wizard
│   │   └── steps/        # BusinessTypeStep, PluginsStep, ConfigureStep, CategoriesPreviewStep
│   ├── pos/              # POS terminal, CashPaymentDialog, ReturnLookupPanel
│   ├── products/         # Product catalog
│   ├── profile/          # User profile, password, manager PIN
│   ├── reports/          # Analytics and reporting
│   ├── settings/         # Shop settings, branding, categories
│   ├── staff/            # Staff management
│   └── transactions/     # Transaction history, returns & refunds
├── router/               # Vue Router with role-based guards
├── stores/               # Pinia — authStore (user, shop, formatCurrency, formatDate, hasPlugin)
├── services/             # Axios API services per module
└── types/                # TypeScript interfaces
```

## Available Scripts

```bash
npm run dev       # Start development server (http://localhost:5173)
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
npm run format    # Format code with Prettier
```

## Features

### Authentication & Onboarding

- JWT-based login with automatic token refresh
- Shop registration with 3-step onboarding wizard
- Business type selection with auto-seeded categories
- Plugin activation (card payments, online payments, loyalty, etc.)
- Shop configuration (currency, timezone, branding)

### Point of Sale (POS)

- Real-time product search by name or SKU
- Cart management with quantity controls and stock validation
- Plugin-based payment method filtering (Cash, Card, Online, Mixed)
- Cash payment dialog with change calculation and denomination breakdown
- Return lookup panel — search by TXN number, phone, or customer name

### Returns & Refunds

- Full return flow with item selection and quantity control
- Manager PIN approval for cashier-initiated returns
- Return history displayed per transaction
- Automatic inventory restocking on return

### Product & Inventory Management

- Full CRUD with dynamic category dropdown (from Settings)
- Inventory tracking with reorder points
- Stock status indicators (In Stock, Low Stock, Out of Stock)

### Customer Management

- Full CRUD with search by name, email, or phone
- Transaction history per customer with total spent

### Transactions

- Paginated list with filters (status, payment method, date range)
- Transaction detail side panel with full item breakdown
- Return processing directly from transaction detail

### Staff Management

- Full CRUD with role assignment (Manager / Cashier)
- Active/Inactive status toggle with confirmation
- Role-based action visibility (owner-only actions hidden from others)

### Reports & Analytics

- Summary cards with period-over-period comparison
- Revenue over time — line chart
- Top products — table ranked by quantity sold
- Payment method breakdown — doughnut chart
- Cashier performance table
- Period filters: Today, This Week, This Month, Custom range
- Export to CSV and PDF

### Settings

- General: shop name, currency, timezone
- Branding: primary color picker with live preview, logo URL
- Categories: full CRUD with drag handle for reordering
- Audit Log: coming soon

### User Profile

- Personal info update
- Password change with validation
- Manager PIN setup (for return approvals)

### Role-Based Access Control

| Feature      | Shop Owner     | Shop Manager   | Cashier                |
| ------------ | -------------- | -------------- | ---------------------- |
| Dashboard    | Full analytics | Full analytics | Shift summary          |
| POS          | ✅             | ✅             | ✅                     |
| Products     | Full CRUD      | Full CRUD      | View only              |
| Inventory    | Full           | Full           | View only              |
| Customers    | Full CRUD      | Full CRUD      | Create + View          |
| Transactions | ✅             | ✅             | ❌                     |
| Returns      | ✅             | ✅             | Via POS (PIN required) |
| Reports      | ✅             | ✅             | ❌                     |
| Staff        | Full CRUD      | ❌             | ❌                     |
| Settings     | ✅             | ❌             | ❌                     |

## Multi-Tenancy

Each shop is completely isolated via PostgreSQL Row Level Security on the backend. The `shopId` is automatically read from the JWT token — the frontend never sends it manually. Currency formatting, date/timezone display, and plugin availability all adapt dynamically per shop configuration.

## Backend Integration

- Backend repository: `prosystem-backend`
- API base URL: `http://localhost:5000`
- Authentication: JWT Bearer tokens (7-day expiry)
- All responses: `{ success: boolean, message: string, data: any }`

## License

Private — All rights reserved.
