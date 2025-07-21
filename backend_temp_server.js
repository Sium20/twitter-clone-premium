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
        version: 'v1.0.7-railway-cors-force',
        corsTest: req.headers.origin || 'no-origin',
        deployment: 'Railway-forced-cors-headers',
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

// Serve static files (including admin panel) - comes after API routes
// Frontend is now served from same domain to avoid CORS issues
// app.use(express.static('../frontend')); // Removed - now handled above

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
    console.log('👥 All users and sessions cleared by admin');
    res.json({ 
        success: true, 
        message: `${userCount} users and ${sessionCount} sessions deleted successfully`,
        timestamp: new Date().toISOString()
    });
});

// Get all users (admin only)
app.get('/api/admin/users', (req, res) => {
    const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt || new Date(user.id).toISOString()
    }));
    res.json(safeUsers);
});

// Update user (admin only)
app.put('/api/admin/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    const { username, email, password } = req.body;
    
    console.log('Admin updating user:', userId);
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if username/email already exists (excluding current user)
    const existingUser = users.find(u => u.id !== userId && (u.username === username || u.email === email));
    if (existingUser) {
        return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    try {
        // Update user data
        users[userIndex].username = username;
        users[userIndex].email = email;
        
        // Update password if provided
        if (password) {
            users[userIndex].password = await bcrypt.hash(password, 10);
        }
        
        console.log('User updated successfully by admin:', username);
        res.json({ 
            success: true, 
            message: 'User updated successfully',
            user: {
                id: users[userIndex].id,
                username: users[userIndex].username,
                email: users[userIndex].email
            }
        });
    } catch (error) {
        console.error('Admin user update error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete user (admin only)
app.delete('/api/admin/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    
    console.log('Admin deleting user:', userId);
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const username = users[userIndex].username;
    
    // Remove user
    users.splice(userIndex, 1);
    
    // Remove user's sessions
    const sessionsBefore = sessions.length;
    sessions = sessions.filter(s => s.userId !== userId);
    const sessionsRemoved = sessionsBefore - sessions.length;
    
    // Remove user's posts
    const postsBefore = posts.length;
    posts = posts.filter(p => p.userId !== userId);
    const postsRemoved = postsBefore - posts.length;
    
    console.log(`User ${username} deleted by admin (${postsRemoved} posts, ${sessionsRemoved} sessions removed)`);
    res.json({ 
        success: true, 
        message: `User ${username} deleted successfully`,
        removed: {
            posts: postsRemoved,
            sessions: sessionsRemoved
        }
    });
});

// Export all data (admin only)
app.get('/api/admin/export', (req, res) => {
    const exportData = {
        users: users.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt || new Date(user.id).toISOString()
        })),
        posts: posts,
        sessions: sessions.map(session => ({
            userId: session.userId,
            createdAt: new Date().toISOString()
        })),
        exportedAt: new Date().toISOString(),
        version: '1.0'
    };
    
    console.log('Data exported by admin');
    res.json(exportData);
});

// Authentication routes
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    console.log('Registration attempt:', { username, email, password: '***' });
    
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields required' });
    }
    
    // Check if user exists
    if (users.find(u => u.email === email || u.username === username)) {
        return res.status(400).json({ error: 'User already exists' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = {
            id: Date.now(),
            username,
            email,
            password: hashedPassword
        };
        
        users.push(user);
        console.log('User registered successfully:', user.username);
        console.log('Total users now:', users.length);
        
        // Create session
        const token = Date.now().toString() + Math.random().toString();
        sessions.push({ token, userId: user.id });
        
        res.json({ token, username });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email/Username and password required' });
    }
    
    console.log('Login attempt for:', email);
    console.log('Registered users:', users.map(u => ({ email: u.email, username: u.username })));
    
    // Allow login with either email or username
    const user = users.find(u => u.email === email || u.username === email);
    if (!user) {
        console.log('User not found for email/username:', email);
        return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    try {
        const validPassword = await bcrypt.compare(password, user.password);
        console.log('Password validation result:', validPassword);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        // Create session
        const token = Date.now().toString() + Math.random().toString();
        sessions.push({ token, userId: user.id });
        
        console.log('Login successful for user:', user.username);
        res.json({ token, username: user.username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Middleware to check authentication
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const session = sessions.find(s => s.token === token);
    if (!session) {
        return res.status(401).json({ error: 'Invalid token' });
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
        username: req.user.username,
        userId: req.user.id, // Add userId for ownership checking
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
