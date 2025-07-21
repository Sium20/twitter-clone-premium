# Admin Panel Access

## 🔐 Admin Panel
Access the admin panel at: `frontend/admin.html`

**Fixed Admin Password:** `admin123`

## 🎯 Admin Features

### Data Management
- **Clear All Data** - Remove all users, posts, and sessions
- **Delete All Posts** - Remove only posts, keep users
- **Delete All Users** - Remove only users and sessions, keep posts structure

### User Management  
- **View All Users** - See complete user list with details
- **Edit Users** - Change username, email, and password
- **Delete Users** - Remove specific users and their content

### Statistics Dashboard
- **Total Users** - Current registered users count
- **Total Posts** - Current posts count  
- **Active Sessions** - Current active login sessions

### Additional Tools
- **Export Data** - Download all platform data as JSON
- **Test Connection** - Verify API connectivity
- **Refresh Stats** - Update statistics in real-time

## 🚀 Quick Start

1. Open `frontend/admin.html` in your browser
2. Enter password: `admin123`
3. Click "Login" to access admin features
4. Use the dashboard to manage your platform

## 🔗 API Endpoints

All admin endpoints are protected and require admin authentication:

- `GET /api/admin/stats` - Get platform statistics
- `POST /api/admin/clear-all` - Clear all data
- `POST /api/admin/clear-posts` - Clear posts only
- `POST /api/admin/clear-users` - Clear users only
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/export` - Export all data

## 🛡️ Security

- Fixed admin password authentication
- Protected admin-only endpoints
- Confirmation dialogs for destructive actions
- Secure password hashing for user updates
- No admin user data stored in database

## 📱 Mobile Support

The admin panel is fully responsive and works on:
- Desktop browsers
- Tablets
- Mobile phones
- All modern browsers with full feature support
