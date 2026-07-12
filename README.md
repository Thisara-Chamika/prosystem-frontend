# ProSystem Frontend 🖥️

A modern, cloud-based multi-tenant SaaS Point of Sale (POS) frontend built with Vue.js 3, TypeScript, and PrimeVue. Each business (tenant) operates in complete isolation with its own data, configuration, branding, and plugin-driven feature set.

![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)
![Vue Router](https://img.shields.io/badge/Vue_Router-5.x-4FC08D?logo=vuedotjs&logoColor=white)
![Pinia](https://img.shields.io/badge/Pinia-3.x-FFD859)
![PrimeVue](<https://img.shields.io/badge/PrimeVue-4.x_(Aura)-41B883>)
![Axios](https://img.shields.io/badge/Axios-1.16.1-5A29E4?logo=axios&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-latest-FF6384?logo=chartdotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

---

## 📖 Overview

ProSystem's frontend is the customer-facing and staff-facing surface of a universal, plugin-extensible POS platform. A shop owner registers, selects a business type, and the app walks them through onboarding — auto-installing the plugins relevant to their business, seeding default categories, and letting them configure branding before their first sale.

Built as a portfolio project to demonstrate real frontend architecture decisions: dynamic, schema-driven UI (no hardcoded business-specific fields), role- and plugin-aware routing, and careful handling of financial/loyalty state to avoid data-loss edge cases.

---

## 🛠️ Tech Stack

**Core**

- Vue.js 3 (Composition API) + TypeScript + Vite

**UI & State**

- PrimeVue 4 (Aura theme) — component library
- Pinia — auth store, shop store, loyalty settings
- Vue Router — role-based and plugin-based route guards
- Chart.js + vue-chartjs — reports & analytics

**Tooling & Deployment**

- Axios (pinned to 1.16.1) — HTTP client with request/response interceptors
- Docker + Nginx Alpine — containerized production build
- Vercel — production hosting, auto-deploy from `main`, preview deploys per branch

---

## ✨ Key Features

**Authentication & Onboarding**

- JWT-based login with automatic token handling
- Guided onboarding wizard: business type selection → default categories preview → auto-installed plugins confirmation (skipped if none apply) → shop configuration
- `businessType` (who the shop is) and `activePlugins` (what features are installed) are treated as fully independent — a shop's identity never changes just because a plugin was added or removed

**Point of Sale (POS)**

- Real-time product search, cart management, stock validation
- Dynamic variant selector — for products with configured attributes (Volume, Type, Size, Color, or anything a shop defines), the cashier selects attributes in sequence with options filtered live to what's actually in stock
- Plugin-gated payment methods (Cash, Card, Online, Mixed)
- Cash payment dialog with change calculation
- Customer loyalty lookup at checkout with atomic point redemption — points are only deducted as part of a completed transaction, never on an abandoned sale
- Return lookup by transaction number, phone, or customer name

**Returns & Refunds**

- Full return flow with per-item quantity control
- Manager PIN approval for cashier-initiated returns
- Automatic inventory restocking on approval

**Product & Inventory Management**

- Full CRUD with dynamic category dropdown
- Product/service distinction — services skip stock tracking entirely
- Configurable reorder points with low-stock indicators

**Plugin System**

- Plugin marketplace (Settings → Plugins) — Active/Available sections, install/uninstall with confirmation dialogs
- Product Variants plugin — the platform's core extensibility example. Owners define their own attributes through a dynamic attribute builder (e.g. a salon defines Volume + Type, a fashion shop defines Size + Color); every downstream screen — Variant Manager, the POS selector, SKU generation — reads these generically, with no hardcoded field names anywhere in the codebase
- Variant Manager — dynamic per-product variant table, columns generated from the shop's configured attributes

**Loyalty Program**

- Core CRM feature available to every shop, independently toggleable in Settings — not plugin-gated
- Configurable earning rate, redemption value, and tier thresholds (Bronze/Silver/Gold) with a live preview before saving
- Customer profile page with tier badge, points value, progress-to-next-tier bar, and full points ledger

**Customer Management**

- Full CRUD, search by name/email/phone
- Dedicated profile page combining purchase history and loyalty data

**Transactions**

- Paginated list with status/payment/date filters
- Detail side panel with full item breakdown and inline return processing

**Staff Management**

- Full CRUD with role assignment, active/inactive toggle
- Owner-only actions hidden from other roles at the UI level

**Reports & Analytics**

- Summary cards, revenue line chart, top products, payment method breakdown, cashier performance
- Period filters (Today / Week / Month / Custom), CSV and PDF export

**Settings**

- General, Branding (live color preview), Categories (drag-to-reorder)
- Plugins (marketplace + dynamic attribute builder)
- Loyalty (rules + live preview)
- Notifications (per-event email toggles, read-only status for the one-time shop welcome email)
- Audit Log (filterable, color-coded activity feed with summary cards)

**User Profile**

- Personal info, password change, manager PIN setup

---

## 📁 Project Structure

src/
├── assets/ → Global CSS variables, base styles
├── components/
│ └── layout/ → AppTopbar, AppSidebar (role + plugin aware), AppLayout
├── views/
│ ├── auth/ → Login
│ ├── customers/ → Customer list + CRUD
│ │ └── profile/ → Loyalty tier, points history, purchases
│ ├── dashboard/ → Owner, manager, cashier dashboards
│ ├── inventory/ → Stock management, reorder points, low-stock alerts
│ ├── onboarding/ → Multi-step wizard
│ │ └── steps/ → BusinessTypeStep, CategoriesPreviewStep,
│ │ AutoInstallPluginsStep, ConfigureStep
│ ├── pos/ → POS terminal, variant selector, cash dialog, returns
│ ├── products/ → Product catalog
│ ├── profile/ → User profile, password, manager PIN
│ ├── reports/ → Analytics and reporting
│ ├── settings/ → General, Branding, Categories, Plugins,
│ │ Loyalty, Notifications, Audit Log
│ ├── staff/ → Staff management
│ ├── transactions/ → History, returns & refunds
│ └── variants/ → Variant Manager (dynamic attributes)
├── router/ → Role-based and plugin-based route guards
├── stores/ → Pinia — authStore (user, shop, businessType, loyaltySettings,
│ formatCurrency, formatDate, hasPlugin, isBusinessType)
├── services/ → Axios API services — auth, shop, category, product, inventory,
│ customer, pos, staff, plugin, loyalty, auditLog, report
└── types/ → TypeScript interfaces

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- npm v9+
- ProSystem Backend running on `http://localhost:5000`

### Installation

```bash
git clone https://github.com/Thisara_Chamika/prosystem-frontend.git
cd prosystem-frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

> **Note:** the API base URL is currently set directly in the Axios instance (`src/services/api.ts`) rather than via an environment variable. If you need to point the frontend at a different backend, update the `baseURL` there.

### Docker (Local / Self-Hosted)

```bash
docker-compose up --build -d
```

The Docker setup uses a multi-stage build — Vite builds the app, then Nginx Alpine serves the static files on port 80.

---

## 📜 Available Scripts

| Script      | Command           | Description                          |
| ----------- | ----------------- | ------------------------------------ |
| Development | `npm run dev`     | Start dev server with hot reload     |
| Build       | `npm run build`   | Build for production                 |
| Preview     | `npm run preview` | Preview the production build locally |
| Lint        | `npm run lint`    | Run ESLint                           |
| Format      | `npm run format`  | Format code with Prettier            |

---

## 🌿 Branch Strategy

Git Flow — feature branches merge to `develop`, `develop` merges to `main` only when stable.

main → production-ready code only, Vercel deploys from here
develop → active development, integration branch
feature/_ → new features, deleted after merge
fix/_ → bug fixes, deleted after merge

---

## ☁️ Deployment

| Layer       | Platform                                                |
| ----------- | ------------------------------------------------------- |
| Frontend    | Vercel (`https://prosystem-frontend-beryl.vercel.app/`) |
| Backend API | Railway                                                 |
| Database    | Supabase (PostgreSQL, Singapore region)                 |

Production deploys automatically on push to `main`. Every other branch gets its own preview deployment.

---

## 🔗 Backend Integration

- Backend repository: `prosystem-backend`
- API base URL: `http://localhost:5000`
- Authentication: JWT Bearer tokens (7-day expiry), payload includes `shopId`, `role`, `businessType`
- All responses: `{ success: boolean, message: string, data: any }`
- Multi-tenancy is enforced entirely on the backend via PostgreSQL RLS — the frontend never sends `shopId` manually

---

## 🗺️ Roadmap

- [ ] Make API base URL configurable via `VITE_API_URL` instead of a hardcoded value
- [ ] Loading skeletons for slower connections (currently spinner-only)
- [ ] Optimize Settings page to load tab data lazily instead of all 5 sections on mount
- [ ] E2E test coverage (Playwright/Cypress)

---

## 👨‍💻 Author

Thisara Chamika
