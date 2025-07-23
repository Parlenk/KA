# Creative Design Platform

A modern, AI-powered advertising design platform inspired by Creatopy, built with Node.js, React, and TypeScript.

## 🚀 Features

- **AI-Powered Design Generation**: Create stunning advertisements with artificial intelligence
- **Professional Templates**: Access thousands of optimized design templates
- **Real-time Collaboration**: Work together with your team in real-time
- **Multi-format Export**: Export designs for web, print, and social media
- **User Management**: Complete authentication and user management system
- **Responsive Design**: Works seamlessly across all devices

## 🏗️ Architecture

### Backend
- **Node.js** with **TypeScript** for type safety
- **Express.js** v4 for robust API development
- **MongoDB** for document storage and user data
- **Redis** for caching and session management
- **JWT** authentication with refresh tokens
- **Bcrypt** for secure password hashing

### Frontend
- **R
eact 18** with **TypeScript**
- **Vite** for fast development and building
- **Tailwind CSS** for responsive styling
- **React Router** for navigation
- **React Query** for server state management
- **Axios** for HTTP requests

## 📁 Project Structure

```
creative-design-platform/
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── config/         # Database and environment configuration
│   │   ├── controllers/    # API route controllers
│   │   ├── middleware/     # Auth and validation middleware
│   │   ├── models/         # MongoDB models and schemas
│   │   ├── routes/         # API route definitions
│   │   ├── utils/          # Utility functions (JWT, etc.)
│   │   ├── validators/     # Request validation schemas
│   │   └── index.ts        # Main server entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                # Environment variables
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── contexts/       # React context providers
│   │   ├── pages/          # Application pages/routes
│   │   ├── services/       # API client and services
│   │   ├── types/          # TypeScript type definitions
│   │   └── App.tsx         # Main React component
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── shared/                 # Shared types and utilities
├── docs/                   # Project documentation
├── infrastructure/         # Deployment and infrastructure
└── README.md
```

## 🛠️ Setup & Installation

### Prerequisites

- **Node.js** 20+ 
- **Python** 3.11+ (for AI services)
- **MongoDB** 15+
- **Redis** 7+
- **Docker Desktop** (optional)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB and Redis:**
   ```bash
   # MongoDB (if installed locally)
   mongod --dbpath /usr/local/var/mongodb

   # Redis (if installed locally) 
   redis-server
   ```

5. **Build and start the server:**
   ```bash
   npm run build
   npm run dev
   ```

   The API server will start at `http://localhost:3002`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

   The React app will start at `http://localhost:3000`

## 🔧 Environment Configuration

### Backend (.env)

```env
# Server Configuration
NODE_ENV=development
PORT=3002
HOST=localhost

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/creative-design-platform
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_IMAGE_TYPES=image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# AI Services (Required for AI features)
OPENAI_API_KEY=your-openai-api-key
REPLICATE_API_TOKEN=your-replicate-token
DEEPL_API_KEY=your-deepl-api-key
REMOVEBG_API_KEY=your-removebg-api-key

# AI Service Configuration
AI_SERVICE_URL=http://localhost:8001
AI_SERVICE_TIMEOUT=300000
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3002/api/v1
VITE_APP_NAME=Creative Design Platform
```

## 📚 API Documentation

### Authentication Endpoints

- **POST** `/api/v1/auth/register` - User registration
- **POST** `/api/v1/auth/login` - User login
- **POST** `/api/v1/auth/logout` - User logout
- **POST** `/api/v1/auth/refresh-token` - Refresh access token
- **GET** `/api/v1/auth/profile` - Get user profile
- **PUT** `/api/v1/auth/profile` - Update user profile
- **PUT** `/api/v1/auth/change-password` - Change password

### Health Check

- **GET** `/health` - Server health status

## 🔐 Authentication

The platform uses JWT-based authentication with the following features:

- **Access tokens** for API requests (7 days default)
- **Refresh tokens** for token renewal (30 days default)
- **Automatic token refresh** in frontend
- **Secure password hashing** with bcrypt
- **Role-based access control** (user/admin)

## 🎨 Design System

### Colors

- **Primary**: Blue shades for main actions and branding
- **Secondary**: Gray shades for text and subtle elements
- **Success**: Green for positive actions
- **Warning**: Yellow for caution states
- **Error**: Red for error states

### Typography

- **Font**: Inter (Google Fonts)
- **Sizes**: Responsive scaling with Tailwind CSS

### Components

- **Buttons**: Primary, secondary, and outline variants
- **Forms**: Styled input fields with validation
- **Cards**: Clean container components
- **Navigation**: Responsive header and sidebar

## 🚦 Development

### Available Scripts

#### Backend
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run clean        # Clean build directory
```

#### Frontend
```bash
npm run dev          # Start Vite development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Code Quality

- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for git hooks (when configured)

## 🔄 Database Schema

### User Model

```typescript
{
  email: string;              // Unique user email
  password: string;           // Hashed password
  firstName: string;          // User's first name
  lastName: string;           // User's last name
  role: 'user' | 'admin';     // User role
  isEmailVerified: boolean;   // Email verification status
  avatar?: string;            // Profile picture URL
  subscription: {             // Subscription details
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'inactive' | 'cancelled';
    expiresAt?: Date;
  };
  usage: {                    // Usage tracking
    imagesGenerated: number;
    storageUsed: number;
    templatesCreated: number;
    monthlyReset: Date;
  };
  preferences: {              // User preferences
    theme: 'light' | 'dark';
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      marketing: boolean;
    };
  };
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🚀 Deployment

### Production Considerations

1. **Environment Variables**: Update all production secrets
2. **Database**: Set up MongoDB Atlas or self-hosted MongoDB
3. **Redis**: Configure Redis Cloud or self-hosted Redis
4. **SSL**: Enable HTTPS for production
5. **Domain**: Configure custom domain
6. **CDN**: Set up CDN for asset delivery
7. **Monitoring**: Add application monitoring

### Docker Support

Docker configurations will be added in future releases for easy deployment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the API documentation

## 🗺️ Roadmap

### Phase 1: MVP (Completed)
- ✅ Backend API with authentication
- ✅ Frontend React application
- ✅ User management system
- ✅ Basic project structure

### Phase 2: Core Features (Completed)
- ✅ Multi-size design canvas implementation
- ✅ Advanced animation timeline system
- ✅ Brand kit management (colors, fonts, logos)
- ✅ Enhanced export pipeline (PNG, JPG, SVG, HTML5, MP4)
- ✅ Professional editor with layers and tools

### Phase 3: AI Integration (Completed)
- ✅ **Advanced Image Generation**: Stable Diffusion XL with multiple art styles
- ✅ **Smart Background Processing**: SAM + DETR powered intelligent background removal
- ✅ **GPT-4 Text Intelligence**: A/B testing, content analysis, industry optimization
- ✅ **Magic Animator**: AI-driven animation generation with context awareness
- ✅ **Image Enhancement**: AI super-resolution and quality improvement
- ✅ **Object Removal**: Advanced inpainting and content-aware editing
- ✅ **30+ AI-powered API endpoints**

### Phase 4: Advanced Features & Polish (Completed)
- ✅ **Professional Canvas Editor**: Smart resize algorithm with AI learning
- ✅ **Comprehensive API Suite**: REST + GraphQL + Webhooks (25+ endpoints)
- ✅ **Social Media Publishing**: 6 major platforms (Facebook, Instagram, LinkedIn, Twitter, Pinterest, TikTok)
- ✅ **Cloud Storage Integration**: Google Drive, Dropbox, OneDrive with auto-sync
- ✅ **Advanced Testing Suite**: Security, accessibility, performance testing
- ✅ **Production Documentation**: 190+ pages of comprehensive guides

### Phase 5: Advanced Features (Next)
- 🔄 Team management and workspaces
- 🔄 Advanced brand guidelines enforcement
- 🔄 Performance analytics and A/B testing
- 🔄 Enterprise integrations and API

---

**Built with ❤️ by the Creative Design Platform Team**