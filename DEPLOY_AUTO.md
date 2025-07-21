# 🚀 Auto-Deploy Your Admin Panel to Firebase & Railway

## 🔥 Firebase Deployment (Frontend)

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase
```bash
firebase login
```

### Step 3: Initialize Firebase (if needed)
```bash
firebase init hosting
```

### Step 4: Deploy Frontend
```bash
firebase deploy --only hosting
```

**Your frontend will be available at:**
```
https://your-project-id.web.app/admin.html
```

---

## 🚆 Railway Deployment (Backend API)

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway
```bash
railway login
```

### Step 3: Deploy Backend
```bash
cd backend
railway deploy
```

**Your backend API will be available at:**
```
https://your-app.up.railway.app/api
```

---

## 🔧 Auto-Deploy Scripts

### Quick Deploy All (Run this command):
```bash
# Deploy both Firebase and Railway automatically
npm run deploy:all
```

### Individual Deployments:
```bash
# Deploy only frontend to Firebase
npm run deploy:frontend

# Deploy only backend to Railway  
npm run deploy:backend
```

---

## 🎯 Final Configuration

Once both are deployed, update your admin panel configuration:

1. **Frontend URL (Firebase):** `https://your-project.web.app/admin.html`
2. **Backend URL (Railway):** `https://your-app.up.railway.app`
3. **Admin Password:** `admin123`

---

## 📱 Access Your Admin Panel

**Live Admin Panel:**
```
https://your-firebase-project.web.app/admin.html
Password: admin123
```

**Backend API:**
```
https://your-railway-app.up.railway.app/api/health
```
