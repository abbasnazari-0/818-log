# GlobalLink Logistics - AI Agent Instructions

## Project Overview
**GlobalLink Logistics** is a multi-agent React+Vite+Firebase logistics management system for China-UAE-Iran shipping routes. The system uses role-based access control (RBAC) with 5 distinct user roles and tracks packages through multiple stages across three geographic regions.

### Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide icons
- **Backend**: Firebase Firestore (database), Firebase Auth
- **Tooling**: Vite, ESLint, Recharts (analytics), QRCode.React
- **Package Manager**: npm
- **Language**: TypeScript with strict typing

---

## Architecture & Data Flow

### Core Domain: Package Lifecycle (3 Regions)
**Packages move through statuses by geographic region**, not role:
1. **China Phase**: `PURCHASED_FROM_SELLER` → `RECEIVED_IN_CHINA` → `QC_CHECKED` → `PACKED_CHINA` → `READY_TO_SHIP_UAE`
2. **UAE Phase**: `ARRIVED_UAE` → `REPACKING` → `READY_TO_SHIP_IRAN` → `SHIPPED_TO_IRAN`
3. **Iran Phase**: `ARRIVED_IRAN` → `OUT_FOR_DELIVERY` → `DELIVERED`
4. **Exception**: `ISSUE_REPORTED` (any phase)

**Key Pattern**: Role-based task visibility in `dataService.getPackagesByRole()` filters `packages` collection by agent's region.

### Data Model Relationships
```
Order (1:N) → Packages (1:N) → TrackingEvents
User (5 roles) ← → Orders (via customerId/userId)
Package.currentStatus determines visible workload for each Agent role
```

**Critical Files**:
- `types.ts`: `PackageStatus`, `Order`, `Package`, `User`, `UserRole` enums
- `services/dataService.ts`: Centralized Firestore operations singleton
- `services/mockData.ts`: Demo data for development/testing
- `context/AuthContext.tsx`: Firebase Auth provider with role-based context

### User Roles (from `UserRole` enum)
| Role | Dashboard | Permissions | Workload |
|------|-----------|-------------|----------|
| ADMIN | Overview stats | Full system access | All orders/packages |
| CHINA_AGENT | Task Board | Update CN-phase packages | Packages in China phase |
| UAE_AGENT | Task Board | Update UAE-phase packages | Packages in UAE phase |
| IRAN_AGENT | Task Board | Update Iran-phase packages | Packages in Iran phase |
| CUSTOMER | My Orders | View only | Own orders via customerId |

**Note**: Customers use `/tracking` (public) without login; agents/admin use role-specific routes.

---

## Critical Patterns & Conventions

### 1. Firebase Firestore Structure
```
db/
  orders/
    ORD-2024-001 → { id, customerId, packages: [], status, totalPrice, ... }
  packages/
    PKG-101 → { id, orderId, currentStatus, trackingNumber, qrCodeData, ... }
  users/
    uid → { uid, email, role, displayName, ... }
  trackingEvents/
    event-id → { packageId, status, timestamp, userId, notes, ... }
  auditLogs/
    log-id → { action, userId, timestamp, details, ... }
```

**Key Pattern**: Denormalized data; `Order` embeds full `packages` array. Standalone `packages` collection mirrors data for agent filtering.

### 2. Service Layer (`dataService` singleton)
All Firestore operations flow through `services/dataService.ts`:
- `getOrders(role, userId)` - role-aware filtering
- `createOrder(order)` - writes to both `orders` & creates standalone `packages` docs
- `getPackagesByRole(role)` - filters by region-specific statuses (see **Firestore 'in' limitation**)
- `seedDatabase()` - populates `MOCK_DATA` (called via Dashboard button for demos)
- `getCustomersWithOrders()` - aggregates orders by customer

**Cost Concern**: `getSystemStats()` reads ALL orders (expensive for real apps; comment warns about this).

### 3. Component Structure
- **Pages** (`pages/*.tsx`): Route-level components, role-specific views
  - `Dashboard.tsx` - Role-aware summaries + stats
  - `OrderList.tsx` - Create/edit orders (admin only)
  - `ScanQR.tsx` - Camera QR scanning for agents
  - `PublicTracking.tsx` - Public tracking (no auth required)
  - `CustomerManagement.tsx` - Newly added; admin-only customer list with order summaries
  - `AgentManagement.tsx` - Admin: create/manage agent accounts

- **Components** (`components/*.tsx`): Reusable UI
  - `Layout.tsx` - Sidebar + role-based navigation
  - `StatusBadge.tsx` - Package status display
  
- **Context** (`context/AuthContext.tsx`): Manages Firebase Auth + user role

### 4. Routing Rules (from `App.tsx`)
```typescript
Public: /tracking (PublicTracking) - no auth needed
Protected Routes (nested under /):
  / → Dashboard (role-aware)
  /orders → OrderList
  /scan → ScanQR
  /users → AgentManagement
  /reports → Reports
  /customers → CustomerManagement (ADMIN only)
  /manifest → OrderList (alias)

Fallback: Unauthenticated users → /login
```

### 5. Styling Conventions
- **Tailwind CSS** exclusively (no CSS modules)
- **Color coding by phase**:
  - China statuses: Blue (`text-blue-500`)
  - UAE statuses: Purple (`text-purple-500`)
  - Iran statuses: Orange (`text-orange-500`)
  - Delivered: Green (`text-green-500`)
  - Issues: Red (`text-red-500`)
- **Layout**: Responsive grid + sidebar on desktop; hamburger menu on mobile

### 6. RTL (Right-to-Left) Support
Project includes Persian/Farsi text (right-aligned). When adding new UI:
- Use `text-right` for Persian sections
- Test with mock Persian data in `mockData.ts`
- StatusBadge & tracking timeline examples in `PublicTracking.tsx`

---

## Common Development Workflows

### Running Locally
```bash
npm install
npm run dev          # Vite dev server on localhost:3000
npm run build        # Production build → dist/
npm run seed         # Populate Firestore with MOCK_DATA (if Firebase connected)
make deploy          # Build + auto-upload to FTP (requires lftp + .env credentials)
```

### Environment Setup
- `GEMINI_API_KEY` in `.env.local` (defined in `vite.config.ts` but not currently used)
- Firebase config in `src/firebase.ts` (assumed already configured)
- Test credentials in `CREDENTIALS.md`

### Adding New Features
1. **New Page/Route**:
   - Create in `pages/` folder
   - Add route to `App.tsx` (nested under `/` if protected)
   - Add menu item in `Layout.tsx` `getNavItems()` for appropriate role
   - Update `UserRole` check if role-specific visibility needed

2. **New Data Query**:
   - Add method to `dataService` class
   - Use `getDocs()` + `query()` + `where()` for Firestore
   - Remember Firestore 'in' operator supports max 10 values

3. **New Status/Type**:
   - Extend `PackageStatus` or `OrderStatus` enum in `types.ts`
   - Update color mapping in `PublicTracking.tsx` `getStatusIcon()`
   - Update filter logic in `dataService.getPackagesByRole()` if region-dependent

### Testing Workflow
- Use `MOCK_DATA` (already seeded): Test credentials in `CREDENTIALS.md`
- Click "Seed Database" button on Dashboard to repopulate
- Public tracking test codes: `PKG-10001`, `PKG-10002`, `PKG-10003` (from CHANGELOG)
- No unit tests in codebase; rely on manual integration testing

---

## Important Gotchas & Constraints

### Firestore 'in' Query Limitation
`where('currentStatus', 'in', targetStatuses)` supports max 10 values. Current implementation works because:
- China phase has 6 statuses
- UAE phase has 4 statuses  
- Iran phase has 3 statuses
Each stays under 10. **If adding more statuses to a single phase, restructure queries.**

### Admin-Only Features
- `CustomerManagement.tsx` visible only to ADMIN role
- Mock data uses test customers; replace with real Firestore queries per `dataService.getCustomersWithOrders()`

### No Authentication Abstraction
Firebase Auth directly used in `AuthContext.tsx`. If migrating auth providers, modify context only (no dependency injection).

### Route Security: Client-Side Only
Route guards in `App.tsx` check `user` context. **Not server-protected.** Use Firestore security rules + auth middleware for production.

---

## Common File Locations (Quick Reference)
| Purpose | File |
|---------|------|
| Type definitions | `types.ts` |
| Status colors/icons | `PublicTracking.tsx`, `StatusBadge.tsx` |
| All data queries | `services/dataService.ts` |
| Demo data | `services/mockData.ts` |
| Authentication logic | `context/AuthContext.tsx` |
| Role-based navigation | `components/Layout.tsx` |
| Role-based routes | `App.tsx` |
| Customer admin page | `pages/CustomerManagement.tsx` |
| Public tracking (no auth) | `pages/PublicTracking.tsx` |

---

## Font & UI Customization
- **Font**: Vazirmatn (imported globally in `index.css` via CDN)
- **Icons**: Lucide React (`lucide-react` package)
- **Charts**: Recharts (`pages/Reports.tsx`, `pages/Dashboard.tsx`)

