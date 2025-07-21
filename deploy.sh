#!/bin/bash

echo "🚀 Starting Auto-Deployment to Firebase & Railway..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
fi

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

echo "🔐 Please make sure you're logged in to both platforms:"
echo "   Firebase: firebase login"
echo "   Railway: railway login"
echo ""

read -p "Are you logged in to both Firebase and Railway? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please login first:"
    echo "  firebase login"
    echo "  railway login"
    exit 1
fi

echo "🔥 Deploying Frontend to Firebase..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo "✅ Frontend deployed successfully to Firebase!"
else
    echo "❌ Frontend deployment failed!"
    exit 1
fi

echo ""
echo "🚆 Deploying Backend to Railway..."
cd backend
railway deploy

if [ $? -eq 0 ]; then
    echo "✅ Backend deployed successfully to Railway!"
else
    echo "❌ Backend deployment failed!"
    exit 1
fi

cd ..

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📱 Your Admin Panel is now live at:"
echo "   Frontend: https://your-project.web.app/admin.html"
echo "   Backend: https://your-app.up.railway.app/api"
echo "   Password: admin123"
echo ""
echo "🔗 Update your Firebase project URL in the admin panel if needed."
