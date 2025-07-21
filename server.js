const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Store data in memory (simple approach) - All data cleared
let posts = [];
let users = [];
let sessions = [];

// Force clear all data on server start
function clearAllData() {
    posts.length = 0;
    users.length = 0;
    sessions.length = 0;
    console.log('🧹 All user data and post data cleared successfully');
}

// Clear data immediately on startup
clearAllData();

// CORS Configuration - Force proper headers for Railway
const allowedOrigins = [
    'https://projectclone-3808d.web.app',
    'https://projectclone-3808d.firebaseapp.com',
    'http://localhost:3000',
    'https://twitterclone-production-58f6.up.railway.app'
];

// Add CORS package as primary solution
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            // For Railway deployment, allow all origins
            return callback(null, true);
        }
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-Admin-Password']
};

app.use(cors(corsOptions));

// Force CORS middleware before everything else (backup solution)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Force set CORS headers immediately
    if (allowedOrigins.includes(origin) || !origin) {
        res.header('Access-Control-Allow-Origin', origin || '*');
    } else {
        res.header('Access-Control-Allow-Origin', '*');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Admin-Password');
    res.header('Access-Control-Max-Age', '86400');
    
    console.log(`🌐 CORS: ${req.method} ${req.path} | Origin: ${origin || 'none'} | Headers set`);
    
    if (req.method === 'OPTIONS') {
        console.log('✅ OPTIONS preflight handled');
        return res.status(200).end();
    }
    
    next();
});

app.use(express.json());

// API Routes (must come before static files)
// Add a simple health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Server is running',
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
        version: 'v1.0.8-main-repo-cors-fix',
        corsTest: req.headers.origin || 'no-origin',
        deployment: 'Railway-main-repo-deployment',
        adminPanel: 'Available at /admin.html',
        corsHeaders: {
            'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods')
        }
    });
});

// API root endpoint
app.get('/api', (req, res) => {
    res.json({ 
        message: 'Twitter Clone API is running', 
        environment: NODE_ENV,
        endpoints: [
            '/api/health', 
            '/api/posts', 
            '/api/register', 
            '/api/login',
            '/api/admin/login',
            '/api/admin/users',
            '/api/admin/clear-data'
        ],
        adminPanel: 'Available at /admin.html'
    });
});

// Clear all data endpoint (for immediate data clearing)
app.post('/api/clear-all-data', (req, res) => {
    clearAllData();
    res.json({ 
        success: true, 
        message: 'All user data and post data cleared successfully',
        timestamp: new Date().toISOString(),
        cleared: {
            posts: 0,
            users: 0,
            sessions: 0
        }
    });
});

// Admin Authentication Middleware
function requireAdminAuth(req, res, next) {
    const adminPassword = req.headers['x-admin-password'];
    if (adminPassword !== 'admin123') {
        return res.status(401).json({ error: 'Admin authentication required' });
    }
    next();
}

// Admin Routes
// Get admin statistics
app.get('/api/admin/stats', (req, res) => {
    res.json({
        users: users.length,
        posts: posts.length,
        sessions: sessions.length,
        timestamp: new Date().toISOString()
    });
});

// Clear all data (admin endpoint)
app.post('/api/admin/clear-all', (req, res) => {
    clearAllData();
    res.json({ 
        success: true, 
        message: 'All data cleared successfully by admin',
        timestamp: new Date().toISOString(),
        cleared: {
            posts: 0,
            users: 0,
            sessions: 0
        }
    });
});

// Clear only posts
app.post('/api/admin/clear-posts', (req, res) => {
    const postCount = posts.length;
    posts.length = 0;
    console.log('🗑️ All posts cleared by admin');
    res.json({ 
        success: true, 
        message: `${postCount} posts deleted successfully`,
        timestamp: new Date().toISOString()
    });
});

// Clear only users (and their sessions)
app.post('/api/admin/clear-users', (req, res) => {
    const userCount = users.length;
    const sessionCount = sessions.length;
    users.length = 0;
    sessions.length = 0;
    posts.length = 0; // Also clear posts since they reference users
    console.log('👥 All users, sessions, and posts cleared by admin');
    res.json({ 
        success: true, 
        message: `${userCount} users and ${sessionCount} sessions deleted successfully`,
        timestamp: new Date().toISOString()
    });
});

// Get all users (admin endpoint)
app.get('/api/admin/users', (req, res) => {
    const sanitizedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        registeredAt: user.registeredAt || 'Unknown'
    }));
    res.json(sanitizedUsers);
});

// Delete specific user (admin endpoint)
app.delete('/api/admin/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const deletedUser = users[userIndex];
    
    // Remove user
    users.splice(userIndex, 1);
    
    // Remove user's sessions
    sessions = sessions.filter(s => s.userId !== userId);
    
    // Remove user's posts
    posts = posts.filter(p => p.userId !== userId);
    
    console.log(`🗑️ Admin deleted user: ${deletedUser.username}`);
    res.json({ 
        success: true, 
        message: `User ${deletedUser.username} deleted successfully`,
        timestamp: new Date().toISOString()
    });
});

// Change user password (admin endpoint)
app.put('/api/admin/users/:id/password', async (req, res) => {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;
    
    if (!newPassword) {
        return res.status(400).json({ error: 'New password required' });
    }
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        users[userIndex].password = hashedPassword;
        
        console.log(`🔒 Admin changed password for user: ${users[userIndex].username}`);
        res.json({ 
            success: true, 
            message: `Password updated for ${users[userIndex].username}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// Change user email (admin endpoint)
app.put('/api/admin/users/:id/email', (req, res) => {
    const userId = parseInt(req.params.id);
    const { newEmail } = req.body;
    
    if (!newEmail) {
        return res.status(400).json({ error: 'New email required' });
    }
    
    // Check if email already exists
    const existingUser = users.find(u => u.email === newEmail && u.id !== userId);
    if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
    }
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const oldEmail = users[userIndex].email;
    users[userIndex].email = newEmail;
    
    console.log(`📧 Admin changed email for user: ${users[userIndex].username} (${oldEmail} → ${newEmail})`);
    res.json({ 
        success: true, 
        message: `Email updated for ${users[userIndex].username}`,
        timestamp: new Date().toISOString()
    });
});

// User registration
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
        return res.status(400).json({ error: 'User already exists with this email or username' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: Date.now(),
            username,
            email,
            password: hashedPassword,
            registeredAt: new Date().toISOString()
        };
        
        users.push(newUser);
        
        // Create session
        const sessionToken = `session_${Date.now()}_${Math.random()}`;
        const session = {
            token: sessionToken,
            userId: newUser.id,
            username: newUser.username,
            createdAt: Date.now()
        };
        sessions.push(session);
        
        console.log(`✅ New user registered: ${username}`);
        res.json({ 
            message: 'User registered successfully', 
            token: sessionToken,
            username: newUser.username
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user by email or username
    const user = users.find(u => u.email === email || u.username === email);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    try {
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create session
        const sessionToken = `session_${Date.now()}_${Math.random()}`;
        const session = {
            token: sessionToken,
            userId: user.id,
            username: user.username,
            createdAt: Date.now()
        };
        sessions.push(session);
        
        console.log(`🔑 User logged in: ${user.username}`);
        res.json({ 
            message: 'Login successful', 
            token: sessionToken,
            username: user.username
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Authentication middleware
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.substring(7);
    const session = sessions.find(s => s.token === token);
    if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    const user = users.find(u => u.id === session.userId);
    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
}

app.get('/api/posts', (req, res) => {
    // Add userId to posts that don't have it (for backward compatibility)
    const postsWithUserIds = posts.map(post => {
        if (!post.userId) {
            // Find user by username for old posts
            const user = users.find(u => u.username === post.username);
            if (user) {
                post.userId = user.id;
            }
        }
        return post;
    });
    res.json(postsWithUserIds);
});

app.post('/api/posts', requireAuth, (req, res) => {
    const { content } = req.body;
    
    if (!content) {
        return res.status(400).json({ error: 'Content required' });
    }
    
    const post = {
        id: Date.now(),
        userId: req.user.id,
        username: req.user.username,
        content,
        timestamp: Date.now() // Store as Unix timestamp for client-side formatting
    };
    
    posts.unshift(post); // Add to beginning
    res.json(post);
});

// Edit post endpoint
app.put('/api/posts/:id', requireAuth, (req, res) => {
    const postId = parseInt(req.params.id);
    const { content } = req.body;
    
    console.log('Edit request for post:', postId, 'by user:', req.user.username);
    
    if (!content) {
        return res.status(400).json({ error: 'Content required' });
    }
    
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) {
        return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = posts[postIndex];
    
    // Check if user owns the post
    if (post.userId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to edit this post' });
    }
    
    // Update the post
    posts[postIndex] = {
        ...post,
        content,
        // Keep original timestamp, don't overwrite it
        edited: true,
        editedAt: Date.now() // Only add edit timestamp
    };
    
    res.json(posts[postIndex]);
});

// Delete post endpoint
app.delete('/api/posts/:id', requireAuth, (req, res) => {
    const postId = parseInt(req.params.id);
    
    console.log('Delete request for post:', postId, 'by user:', req.user.username);
    
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) {
        return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = posts[postIndex];
    
    // Check if user owns the post
    if (post.userId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to delete this post' });
    }
    
    // Remove the post
    posts.splice(postIndex, 1);
    
    res.json({ message: 'Post deleted successfully' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        error: NODE_ENV === 'production' ? 'Internal server error' : err.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start the server (works for both local and Railway)
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
    console.log(`Admin panel available at: ${NODE_ENV === 'production' ? 'https://twitterclone-production.up.railway.app' : 'http://localhost:3000'}/admin.html`);
});

// Export for compatibility
module.exports = app;
