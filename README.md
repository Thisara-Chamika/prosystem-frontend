# ProSystem Frontend

A modern, responsive Point of Sale (POS) frontend for the ProSystem multi-tenant SaaS platform. Built with Vue.js 3, TypeScript, and PrimeVue.

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Vue.js | 3.x | Frontend framework |
| TypeScript | 5.x | Type safety |
| Vite | 6.x | Build tool & dev server |
| Vue Router | 4.x | Client-side routing |
| Pinia | 3.x | State management |
| PrimeVue | 4.x | UI component library |
| Axios | 1.x | HTTP client (API calls) |

## Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- ProSystem Backend running on http://localhost:5000

## Getting Started

\`\`\`bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/prosystem-frontend.git

# Navigate into the project
cd prosystem-frontend

# Install dependencies
npm install

# Start the development server
npm run dev
\`\`\`

The app will be available at http://localhost:5173

## Project Structure

\`\`\`
src/
├── assets/         # Images, global CSS
├── components/     # Reusable UI components
├── views/          # Page-level components
├── router/         # Vue Router configuration
├── stores/         # Pinia state stores
├── services/       # API call functions (Axios)
└── types/          # TypeScript interfaces & types
\`\`\`

## Available Scripts

\`\`\`bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
npm run format    # Format code
\`\`\`

## Backend Integration

This frontend connects to the ProSystem REST API backend.

- Backend repository: prosystem-backend
- API base URL: http://localhost:5000
- Authentication: JWT Bearer tokens

## Features (MVP)

- [ ] User authentication (login/logout)
- [ ] Product management (CRUD)
- [ ] Inventory tracking
- [ ] POS screen (cart + checkout)
- [ ] Customer management
- [ ] Transaction history

## Multi-Tenancy

Each shop (tenant) is completely isolated. The shopId is automatically handled via the JWT token - the frontend never needs to manually send it.

## License

Private - All rights reserved.
