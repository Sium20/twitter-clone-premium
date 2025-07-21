// Simple CORS test server
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Simple CORS middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    console.log(`Request: ${req.method} ${req.path} from ${origin || 'no-origin'}`);
    
    // Set CORS headers for Firebase
    res.header('Access-Control-Allow-Origin', 'https://projectclone-3808d.web.app');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        console.log('Preflight request');
        return res.status(204).end();
    }
    
    next();
});

app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        message: 'CORS test successful!',
        origin: req.headers.origin || 'no-origin',
        timestamp: new Date().toISOString(),
        version: 'test-1.0'
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Test server running',
        cors: 'enabled',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
});
