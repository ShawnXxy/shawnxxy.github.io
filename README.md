# Shawn's Portfolio Website

A modern portfolio website with clean separation between traditional static web files and TypeScript development.

## 📁 Project Structure

```
📁 static/                    # 🌐 Production-ready static files (GitHub Pages)
  📁 css/                     # Production CSS (minified)
  📁 js/                      # Production JS + ES6 modules
  📁 fonts/                   # Web fonts
  📁 images/                  # Images and assets
  📁 favicons/                # Favicon files
  📁 downloadable/            # Resume and downloadable files
  📄 index.html               # Production HTML

📁 src/                       # 🛠️ TypeScript development source
  📁 app/                     # Main application logic
  📁 components/              # Reusable components
    📁 content-renderers/     # Content rendering components
  📁 styles/                  # SCSS/CSS source files
  📁 types/                   # TypeScript type definitions
  📁 utils/                   # Utility functions
  📁 tests/                   # Unit tests
  📄 index.html               # Development HTML

📁 common/                    # 📊 Shared data and scripts
  📁 scripts/                 # Build and utility scripts
  📁 data/                    # Portfolio data models

📁 dist/                      # 📦 TypeScript build output
📁 .github/                   # 🚀 CI/CD workflows

```

## 🚀 Development Workflows

### Option 1: Traditional Static Development
- Work directly in `static/` folder
- Use ES6 modules for modern features
- No build process required
- Deploy directly to GitHub Pages

### Option 2: TypeScript Development
- Develop in `src/` folder with full TypeScript support
- Use `npm run build` to compile to `dist/`
- Use GitHub Actions for automated deployment

## 🛠️ Available Scripts

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Local server for static files
python -m http.server 8000
```

## 📝 Key Features

- **Dynamic Content Rendering**: Automatically styles first letters without hardcoded HTML
- **Type Safety**: Full TypeScript support for development
- **Component Architecture**: Modular, reusable components
- **GitHub Pages Ready**: Static files optimized for GitHub Pages
- **CI/CD Pipeline**: Automated deployment with GitHub Actions

## 🌐 Deployment

### GitHub Pages (Static)
1. Push to `main` branch
2. Files in `static/` are served directly
3. No build process required

### GitHub Actions (TypeScript)
1. Push TypeScript changes to `main`
2. GitHub Actions builds and deploys automatically
3. Production files generated from `src/`

## 🔧 Configuration

- **TypeScript**: See `tsconfig.json`
- **Webpack**: See `webpack.config.js`
- **CI/CD**: See `.github/workflows/deploy.yml`
- **Styles**: Main styles in `src/styles/style.scss`

## 📦 Dependencies

### Development
- TypeScript
- Webpack
- SCSS support
- Testing framework

### Production
- Pure ES6 modules
- No runtime dependencies
- Optimized for performance
