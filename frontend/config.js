// Configuration for the frontend
const CONFIG = {
    // When running locally, the backend is on localhost:3000
    // When deployed to Firebase, it connects to the deployed Railway backend
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000' 
        : 'https://twitterclone-production-58f6.up.railway.app'
};
