#!/bin/bash

# Kredivo Ads Center - GitHub Push Script
echo "🚀 Kredivo Ads Center - GitHub Deployment Script"
echo "================================================"

# Check if GitHub repository URL is provided
if [ -z "$1" ]; then
    echo "❌ Please provide your GitHub repository URL"
    echo "Usage: ./push-to-github.sh https://github.com/USERNAME/REPO.git"
    echo ""
    echo "Example:"
    echo "./push-to-github.sh https://github.com/ensonarantes/kredivo-ads-center.git"
    exit 1
fi

GITHUB_URL="$1"
echo "📡 GitHub Repository: $GITHUB_URL"

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: Please run this script from the project root directory (where vercel.json is located)"
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Git repository not initialized"
    exit 1
fi

# Add remote origin
echo "🔗 Adding GitHub remote..."
git remote add origin "$GITHUB_URL" 2>/dev/null || {
    echo "⚠️  Remote 'origin' already exists, updating URL..."
    git remote set-url origin "$GITHUB_URL"
}

# Verify we have commits
if ! git log --oneline -1 > /dev/null 2>&1; then
    echo "❌ Error: No commits found. Please commit your changes first."
    exit 1
fi

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "🌐 Next Steps:"
    echo "1. Go to vercel.com and sign in with GitHub"
    echo "2. Click 'New Project' and import your repository"
    echo "3. Configure as follows:"
    echo "   - Framework: Vite"
    echo "   - Root Directory: frontend"
    echo "   - Build Command: npm run build"
    echo "   - Output Directory: dist"
    echo ""
    echo "4. Add environment variables:"
    echo "   VITE_API_URL=/api/v1"
    echo "   VITE_APP_NAME=Kredivo Ads Center"
    echo "   NODE_ENV=production"
    echo ""
    echo "🎯 Your repository: $GITHUB_URL"
else
    echo "❌ Failed to push to GitHub. Please check your credentials and repository access."
    exit 1
fi