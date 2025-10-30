---
description: Repository Information Overview
alwaysApply: true
---

# Bal Krishna Nivas Form Repository

## Repository Summary
A full-stack family hierarchy form management system designed to collect and organize family member information. The application features a React-based frontend with Vite bundler and a Node.js/Express backend connected to MongoDB. Key feature: parent autocomplete search that auto-fills family member data from existing records.

## Repository Structure
- **client/**: React frontend application with Vite build system
- **server/**: Node.js/Express backend API server
- **AUTOCOMPLETE_FEATURE_SETUP.md**: Documentation of the parent autocomplete feature implementation

### Main Repository Components
- **Frontend Client**: React 18 application with Tailwind CSS styling and form validation
- **Backend Server**: Express API with MongoDB integration for data persistence
- **Database**: MongoDB collection for storing family hierarchy information

---

## Frontend Client Project
**Configuration Files**: `client/package.json`, `client/vite.config.js`, `client/tailwind.config.js`, `client/postcss.config.js`

### Language & Runtime
**Language**: JavaScript (ES6+)
**Runtime**: Node.js with ES modules
**Framework**: React 18.3.1
**Build Tool**: Vite 5.4.10

### Dependencies
**Main Dependencies**:
- `react` (18.3.1) - UI framework
- `react-dom` (18.3.1) - DOM rendering
- `vite` (5.4.10) - Build tool and dev server
- `tailwindcss` (3.4.14) - CSS utility framework
- `react-hook-form` (7.53.1) - Form state management
- `axios` (1.7.7) - HTTP client for API calls
- `framer-motion` (11.0.0) - Animation library

**Development Dependencies**:
- `@vitejs/plugin-react` (4.3.1) - React JSX support for Vite
- `@types/react` (18.3.8) - React TypeScript definitions
- `@types/react-dom` (18.3.3) - React DOM TypeScript definitions
- `eslint` (8.57.0) - Code linting
- `eslint-plugin-react` (7.35.2) - React-specific ESLint rules
- `autoprefixer` (10.4.20) - CSS vendor prefixing
- `postcss` (8.4.49) - CSS transformation
- `@tailwindcss/forms` (0.5.9) - Tailwind form styling

### Build & Installation
```bash
# Development server (runs on port 5173)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Linting
npm run lint
```

### Main Files & Resources
- **entry point**: `client/index.html` - HTML entry point
- **app root**: `client/src/main.jsx` - React application entry
- **components**: `client/src/components/` - Reusable React components including ParentAutocomplete
- **pages**: `client/src/pages/` - Page components like FamilyFormPage
- **vite proxy**: Configured to proxy API calls from `/api` to `http://localhost:5000`

### Configuration Details
**Vite Server Configuration**:
- Port: 5173
- API Proxy: `/api` routes to backend server at `http://localhost:5000`
- React plugin enabled for JSX transformation

**Tailwind CSS**:
- Custom color scheme with primary (cyan) and accent (pink) colors
- Custom shadow for card styling
- Content scanning: `./index.html`, `./src/**/*.{js,jsx,ts,tsx}`

---

## Backend Server Project
**Configuration Files**: `server/package.json`, `server/server.js`, `server/.env.example`

### Language & Runtime
**Language**: JavaScript (Node.js ES modules)
**Runtime**: Node.js (ES6+ modules enabled with `"type": "module"`)
**Web Framework**: Express 4.21.2

### Dependencies
**Main Dependencies**:
- `express` (4.21.2) - Web framework
- `mongoose` (7.8.7) - MongoDB ODM and schema validation
- `cors` (2.8.5) - Cross-Origin Resource Sharing middleware
- `dotenv` (16.6.1) - Environment variable management
- `multer` (1.4.5-lts.1) - File upload middleware for profile images

**Development Dependencies**:
- `nodemon` (3.1.10) - Automatic server restart on file changes
- `eslint` (8.57.1) - Code linting
- `tailwindcss` (4.1.14) - CSS utilities (used for email templates)
- `@tailwindcss/forms` (0.5.10) - Form styling
- `autoprefixer` (10.4.21) - CSS vendor prefixing

### Build & Installation
```bash
# Development mode (with auto-restart on changes)
npm run dev

# Production mode
npm start

# Code linting
npm run lint
```

### Main Files & Resources
- **entry point**: `server/server.js` - Server initialization
- **routes**: `server/routes/familyRoutes.js` - API route definitions
- **controllers**: `server/controllers/familyController.js` - Route handlers including searchParents function
- **models**: `server/models/` - Mongoose schema definitions
- **middlewares**: `server/middlewares/` - Custom middleware functions
- **uploads**: `server/uploads/` - Directory for profile image storage

### Configuration Details
**Environment Variables** (from `.env.example`):
- `PORT=5000` - Server port
- `MONGO_URI=mongodb+srv://gogtekulam:gogtekul@cluster0.t3c0jt6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0` - MongoDB connection
- `CLIENT_ORIGIN=http://localhost:5173` - CORS client origin

**Server Setup**:
- Static file serving from `/uploads` directory for profile images
- CORS enabled for client communication
- JSON body parser for API requests
- Health check endpoint at `/health`

**Database**:
- **Database**: `test`
- **Collection**: `Heirarchy_form`
- **Connection**: MongoDB via Mongoose ODM

### API Features
**Parent Search Endpoint**:
- **Route**: `GET /api/family/search?query={search_term}`
- **Functionality**: Case-insensitive search across family members
- **Search fields**: firstName, middleName, lastName
- **Returned fields**: Full name, email, phone, DOB, profile image
- **Limit**: Returns up to 10 matching results
- **Auto-fill integration**: Supports auto-population of form fields with selected parent data

---

## Technology Stack Summary
| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 18.3.1 |
| Build Tool | Vite | 5.4.10 |
| Styling | Tailwind CSS | 3.4.14 |
| HTTP Client | Axios | 1.7.7 |
| Form Handling | React Hook Form | 7.53.1 |
| Animations | Framer Motion | 11.0.0 |
| Backend | Express | 4.21.2 |
| Database | MongoDB | (local/cloud) |
| ODM | Mongoose | 7.8.7 |
| File Uploads | Multer | 1.4.5 |
| Development | Node.js ES modules | Latest LTS |

## Getting Started
1. **Backend Setup**: `cd server && npm install && npm run dev`
2. **Frontend Setup**: `cd client && npm install && npm run dev`
3. **Database**: Ensure MongoDB is running on `mongodb://localhost:27017`
4. **Access**: Frontend available at `http://localhost:5173`
