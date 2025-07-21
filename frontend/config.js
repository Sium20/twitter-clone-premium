// Configuration for Twitter Clone
const CONFIG = (() => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // Smart API base detection
    let API_BASE_URL;
    
    // If running from file:// protocol, default to localhost
    if (protocol === 'file:') {
        API_BASE_URL = 'http://localhost:3000';
    }
    // If localhost with port, use localhost backend
    else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        API_BASE_URL = 'http://localhost:3000';
    }
    // If running on Firebase hosting, use Railway backend
    else if (hostname.includes('.web.app') || hostname.includes('.firebaseapp.com')) {
        // Try direct connection first, then fallback to CORS proxy if needed
        API_BASE_URL = 'https://twitterclone-production-58f6.up.railway.app';
    }
    // If running on Railway domain, use same origin (no CORS needed)
    else if (hostname.includes('.railway.app') || hostname.includes('railway')) {
        API_BASE_URL = `${protocol}//${hostname}${port ? ':' + port : ''}`;
    }
    // If running on same server as backend, use same origin
    else if (port === '3000' || port === '') {
        API_BASE_URL = `${protocol}//${hostname}${port ? ':' + port : ''}`;
    }
    // Default production server
    else {
        API_BASE_URL = 'https://twitterclone-production-58f6.up.railway.app';
    }
    
    console.log('Frontend Configuration:', {
        currentURL: window.location.href,
        apiBaseURL: API_BASE_URL,
        hostname: hostname,
        protocol: protocol,
        port: port
    });
    
    return {
        API_BASE_URL: API_BASE_URL,
        APP_NAME: 'Twitter Clone',
        VERSION: '1.0.5',
        ENVIRONMENT: hostname.includes('.web.app') ? 'production' : 'development'
    };
})();
