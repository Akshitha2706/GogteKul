---
description: Repository Information Overview
alwaysApply: true
---

# Gogte Kulavrutthanta - Repository Information

## Repository Summary
Gogte Kulavrutthanta is a **MERN stack** web application for the Gogte family clan to connect generations, share news, and organize events. It features an interactive family tree visualization, member profiles, event management, and news sharing capabilities. The frontend is fully functional with React, while the backend API is built with Express.js and MongoDB.

## Repository Structure
`
GogteKulavrutthanta/
├── frontend/                 # React frontend application
│   ├── public/              # Static assets
│   ├── src/                 # React source code
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── contexts/        # React contexts
│   │   ├── locales/         # i18n translations
│   │   ├── utils/           # Utility functions
│   │   ├── App.js           # Main app component
│   │   └── index.js         # React entry point
│   ├── package.json         # Dependencies and scripts
│   └── tailwind.config.js   # Tailwind CSS config
├── backend/                 # Node.js/Express API
│   ├── routes/              # API route handlers
│   │   └── auth.js          # Authentication routes
│   ├── middleware/          # Express middleware
│   │   └── auth.js          # JWT verification
│   ├── server.js            # Express server entry point
│   └── package.json         # Dependencies and scripts
└── README.md                # Project documentation
`

### Main Components
- **Frontend Application**: React-based UI with family tree visualization, member profiles, event management, and news sharing
- **Backend API**: Express.js server providing REST endpoints for authentication, family data retrieval, and admin functions
- **Family Tree Engine**: Dynamic relationship calculation and hierarchical tree generation
- **Authentication System**: JWT-based user authentication with role-based access control

## Projects

### Frontend (React Application)
**Configuration File**: rontend/package.json

#### Language & Runtime
**Language**: JavaScript (JSX)
**Runtime**: Node.js (v16+ recommended)
**Build Tool**: Create React App (react-scripts 5.0.1)
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- React 18.3.1 - UI framework
- React Router DOM 6.28.0 - Client-side routing
- Axios 1.11.0 - HTTP client
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- Lucide React 0.539.0 - Icon library
- i18next 25.3.2 - Internationalization framework
- D3.js 7.9.0 - Data visualization for family tree
- React DOM 18.3.1 - React DOM rendering

**Development Dependencies**:
- @testing-library/react 16.3.0 - React testing utilities
- @testing-library/jest-dom 6.6.3 - DOM matchers
- @testing-library/user-event 13.5.0 - User interaction simulation
- Tailwind CSS 3.4.17 - CSS framework
- PostCSS 8.5.6 - CSS post-processor
- Autoprefixer 10.4.21 - CSS vendor prefixer

#### Build & Installation
`ash
# Install dependencies
cd frontend
npm install

# Development server
npm start

# Build for production
npm build

# Run tests
npm test

# Eject (one-way operation to expose webpack config)
npm run eject
`

#### Testing
**Framework**: Jest + React Testing Library
**Test Location**: src/ directory with .test.js files
**Naming Convention**: *.test.js
**Configuration**: setupTests.js includes jest-dom matchers
**Run Command**:
`ash
cd frontend
npm test
`

### Backend (Express.js API)
**Configuration File**: ackend/package.json

#### Language & Runtime
**Language**: JavaScript (Node.js)
**Runtime**: Node.js (v16+ recommended)
**Module System**: ES6 modules (type: "module")
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- Express 4.19.2 - Web framework
- MongoDB 6.8.0 - Database driver
- JWT (jsonwebtoken 9.0.2) - Token authentication
- bcryptjs 2.4.3 - Password hashing
- CORS 2.8.5 - Cross-origin requests
- dotenv 16.4.5 - Environment configuration
- googleapis 159.0.0 - Google APIs integration

**Development Dependencies**:
- nodemon 3.1.4 - Auto-restart during development

#### Build & Installation
`ash
# Install dependencies
cd backend
npm install

# Development with auto-reload
npm run dev

# Production server
npm start
`

**Environment Configuration**: The backend uses environment variables via dotenv:
- MONGODB_URI - MongoDB connection string
- MONGODB_DB - Database name
- MONGODB_COLLECTION - Family members collection
- MONGODB_LOGIN_COLLECTION - Users authentication collection
- JWT_SECRET - JWT signing secret
- PORT - Server port (default: 4000)

#### API Endpoints
**Family Management**:
- GET /api/family/members - Fetch family members with optional level filtering
- POST /api/family/members/by-sernos - Fetch multiple members by serial numbers
- GET /api/family/members/by-serno/:serNo - Single member lookup
- GET /api/family/members-new - All members for visual tree
- GET /api/family/all-relationships - Static relationship data
- GET /api/family/dynamic-relations/:serNo - Dynamic relationship calculation
- GET /api/family/hierarchical-tree - Single-root hierarchical tree

**Authentication**:
- POST /api/auth/register - User registration
- POST /api/auth/login - User login

**Admin**:
- GET /api/admin/stats - Family statistics (requires admin role)
- GET /api/admin/family-members - All family members (requires admin role)
- GET /api/admin/news - News management (requires admin role)

#### Middleware
**Authentication Middleware** (middleware/auth.js):
- erifyToken - JWT token validation
- equireAdmin - Admin role check
- equireDBA - DBA role check
- equireAdminOrDBA - Combined admin/DBA check

### Architecture Highlights
- **Family Tree Engine**: Calculates relationships dynamically using serial numbers and parent-child mappings
- **Hierarchical Tree**: Single-root tree generation with support for multi-generational families
- **Role-Based Access Control**: Admin, DBA, and member roles with middleware protection
- **Authentication Flow**: JWT tokens with user registration and login
- **Frontend-Backend Communication**: Axios client configured with proxy to backend on port 4000
