# Deployment Instructions

## 🚀 Push to GitHub

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username:

```bash
cd "/Users/ensonarantes/Cursor project/Kredivo Ads/creative-design-platform"

# Add GitHub remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/kredivo-ads-center.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## 🌐 Deploy to Vercel

### Option 1: Via Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)** and sign in with GitHub
2. **Click "New Project"**
3. **Import your GitHub repository** (`kredivo-ads-center`)
4. **Configure deployment**:
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. **Add Environment Variables** in Vercel dashboard:
   ```
   VITE_API_URL=/api/v1
   VITE_APP_NAME=Kredivo Ads Center
   VITE_NODE_ENV=production
   NODE_ENV=production
   ```

6. **Deploy** - Click "Deploy" button

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project root
cd "/Users/ensonarantes/Cursor project/Kredivo Ads/creative-design-platform"
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? [your account]
# - Link to existing project? N
# - What's your project's name? kredivo-ads-center
# - In which directory is your code located? ./
```

## 🔧 Production Environment Variables

Add these in your Vercel project settings:

### Frontend Variables:
```
VITE_API_URL=/api/v1
VITE_WS_URL=wss://your-app.vercel.app
VITE_APP_NAME=Kredivo Ads Center
VITE_NODE_ENV=production
VITE_ENABLE_AI_FEATURES=false
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=false
```

### Backend Variables:
```
NODE_ENV=production
JWT_SECRET=your-super-secure-production-jwt-secret-key
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kredivo-ads-prod
REDIS_URL=redis://username:password@host:port
```

## 🎯 After Deployment

1. **Test the deployment**: Visit your Vercel URL
2. **Check functionality**: 
   - Login with demo credentials: `demo@example.com` / `demo123`
   - Create a new project
   - Test the canvas editor
   - Try template selection

3. **Monitor**: Check Vercel dashboard for any errors

## 🔄 Future Deployments

Every push to the `main` branch will automatically trigger a new deployment on Vercel.

## 🛠️ Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click "Domains" tab
3. Add your custom domain
4. Update DNS settings as instructed by Vercel

## 📞 Support

If you encounter any issues:
1. Check Vercel deployment logs
2. Verify environment variables are set correctly
3. Ensure all dependencies are in package.json