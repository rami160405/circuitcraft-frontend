# CircuitCraft Frontend

This is the frontend application for CircuitCraft - a Boolean circuit builder web application.

## 🚀 Deployment to Vercel

### Quick Deploy

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-frontend-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the settings
   - Click "Deploy"

### Configure Backend URL

After deploying your backend to Railway, update the API configuration:

1. **Option 1: Update config.js** (before deploying)
   ```javascript
   window.API_CONFIG = {
     BACKEND_URL: 'https://your-app.railway.app'
   };
   ```

2. **Option 2: Use Vercel Environment Variables** (recommended)
   - In Vercel dashboard, go to Project Settings > Environment Variables
   - Add: `VITE_API_URL` or create a build script that replaces the config.js value
   - Or use Vercel's Rewrites feature to proxy API calls

### Manual Configuration

If you need to manually set the backend URL:

1. Edit `config.js`:
   ```javascript
   window.API_CONFIG = {
     BACKEND_URL: 'https://your-railway-backend.railway.app'
   };
   ```

2. Commit and push to trigger a new deployment

## 📁 Project Structure

```
frontend/
├── css/
│   └── style.css          # Global styles
├── js/
│   └── main.js            # Main application logic
├── images/
│   └── circuit.png        # Assets
├── *.html                 # HTML pages
├── react-equations.jsx   # React component
├── config.js              # API configuration
└── vercel.json            # Vercel deployment config
```

## 🔧 Local Development

1. **Serve the frontend** (using any static server):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js http-server
   npx http-server -p 8000
   
   # Using VS Code Live Server extension
   ```

2. **Update config.js** for local development:
   ```javascript
   window.API_CONFIG = {
     BACKEND_URL: null  // Auto-detects localhost:5000
   };
   ```

3. **Make sure backend is running** on `http://localhost:5000`

## 🌐 Environment Variables

For Vercel deployment, you can set:
- `VITE_API_URL` - Backend API URL (if using build-time replacement)

## 📝 Notes

- All paths are relative, so the app works in any subdirectory
- The app automatically detects localhost for development
- CORS is handled by the backend server
- Authentication tokens are stored in sessionStorage

## 🔗 Related

- Backend repository: [Link to backend repo]
- Live site: [Your Vercel URL]

