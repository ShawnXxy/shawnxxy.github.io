# Shawn's Portfolio Website

A modern static portfolio website built with ES6 modules and automated GitHub integration.

## 📁 Project Structure

```
📁 static/                    # 🌐 Production files (served by GitHub Pages)
  📁 css/                     # Bootstrap + custom CSS
  📁 js/                      # ES6 modules and libraries
  📁 data/                    # Portfolio content and GitHub language data
  📁 fonts/                   # Web fonts (Bootstrap icons)
  📁 images/                  # Images and assets
  📁 favicons/                # Favicon files
  📁 downloadable/            # Resume and downloadable files
  📄 index.html               # Main HTML file

📁 src/                       # 🛠️ Reserved for future TypeScript development
📁 .github/                   # 🚀 CI/CD workflows

```

## 🚀 Development

### Static Development (Current)

Work directly in the `static/` folder with:

- **ES6 modules** for modern JavaScript features
- **No build process** required
- **Direct deployment** to GitHub Pages
- **Live development** using PowerShell helper script

### Future TypeScript Support

The `src/` folder is reserved for future TypeScript development when needed.

## 🛠️ Development Scripts

### PowerShell Helper (.\dev.ps1)

```powershell
# Serve static files on localhost:8000
.\dev.ps1 static

# Generate GitHub language data (requires GitHub token)
.\dev.ps1 build-languages

# Show all available commands
.\dev.ps1 help
```

### Node.js Scripts

```bash
# Generate GitHub language data
npm run build-languages
```

## 📝 Key Features

- **Dynamic Content Management**: JSON-driven content with automatic styling via `ContentManager` class
- **GitHub Integration**: Automated language statistics from GitHub API
- **Azure Maps Integration**: Interactive contact section mapping
- **Responsive Design**: Bootstrap-based responsive layout
- **Modern JavaScript**: ES6 modules without build complexity
- **Automated Deployment**: GitHub Pages with weekly data updates

## 🌐 Deployment

### GitHub Pages

1. Push changes to `main` branch
2. Static files are served directly from `static/` folder
3. GitHub Actions automatically updates language data weekly

### Manual Language Data Update

```bash
# Set environment variable (or create .env file)
$env:git_token = "your_github_token"

# Generate language data
npm run build-languages
# or
.\dev.ps1 build-languages
```

## 🔧 Configuration

- **Content**: Portfolio content in `static/data/about-content.json`
- **Styles**: Main styles in `static/css/style.css` + Bootstrap
- **GitHub API**: Configure token in `.env` file for language data updates
- **Azure Maps**: Integrated for contact section (configure in `static/js/azure-maps-integration.js`)

## 📊 Data Management

### Portfolio Content

Edit `static/data/about-content.json` to update:

- About section text
- Skills and experience
- Project information
- Contact details

### GitHub Language Data

Generated automatically from GitHub API:

- `github-languages.json` - Basic language percentages
- `github-languages-detailed.json` - Detailed repository data

## 📦 Dependencies

### Runtime Dependencies

- **@octokit/core** - GitHub API integration
- **dotenv** - Environment variable management

### Frontend Libraries (CDN)

- **Bootstrap 3.x** - CSS framework
- **Font Awesome** - Icons
- **jQuery** - DOM manipulation and animations
- **Azure Maps** - Interactive mapping

### Development Tools

- **Node.js** - For GitHub API scripts
- **PowerShell** - Development helper scripts

## 🚀 Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/ShawnXxy/shawnxxy.github.io.git
   cd shawnxxy.github.io
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment** (optional, for GitHub data updates)

   ```bash
   # Create .env file with your GitHub token
   echo "git_token=your_github_personal_access_token" > .env
   ```

4. **Start development server**

   ```powershell
   .\dev.ps1 static
   ```

5. **Visit your site**

   Open [http://localhost:8000](http://localhost:8000) in your browser
