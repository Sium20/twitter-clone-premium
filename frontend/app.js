// Configuration for different environments
const CONFIG = {
    production: {
        API_BASE_URL: 'https://twitterclone-production-58f6.up.railway.app',
        ENV: 'production'
    },
    development: {
        API_BASE_URL: 'http://localhost:3000',
        ENV: 'development'
    }
};

// Detect environment
const currentConfig = window.location.hostname === 'localhost' ? CONFIG.development : CONFIG.production;
const API_BASE_URL = currentConfig.API_BASE_URL;

// Global state
let currentUser = null;
let currentToken = localStorage.getItem('token');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    if (currentToken) {
        loadProfile();
    } else {
        showLogin();
    }
});

// Authentication functions
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}/api${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
    }

    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

async function register() {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    if (!username || !email || !password) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const data = await apiCall('/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });

        currentToken = data.token;
        currentUser = data.user;
        localStorage.setItem('token', currentToken);
        
        showMain();
        loadPosts();
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
}

async function login() {
    const username = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const data = await apiCall('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        currentToken = data.token;
        currentUser = data.user;
        localStorage.setItem('token', currentToken);
        
        showMain();
        loadPosts();
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

async function logout() {
    try {
        await apiCall('/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    currentToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    showLogin();
}

async function loadProfile() {
    try {
        const data = await apiCall('/profile');
        currentUser = data.user;
        showMain();
        loadPosts();
    } catch (error) {
        console.error('Profile load failed:', error);
        logout();
    }
}

// Post functions
async function createPost() {
    const content = document.getElementById('content').value;
    
    if (!content.trim()) {
        alert('Please enter some content');
        return;
    }

    try {
        await apiCall('/posts', {
            method: 'POST',
            body: JSON.stringify({ content })
        });

        document.getElementById('content').value = '';
        loadPosts();
    } catch (error) {
        alert('Failed to create post: ' + error.message);
    }
}

async function loadPosts() {
    try {
        const posts = await apiCall('/posts');
        displayPosts(posts);
    } catch (error) {
        console.error('Failed to load posts:', error);
        document.getElementById('posts').innerHTML = '<p>Failed to load posts. Please try again.</p>';
    }
}

async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) {
        return;
    }

    try {
        await apiCall(`/posts/${postId}`, { method: 'DELETE' });
        loadPosts();
    } catch (error) {
        alert('Failed to delete post: ' + error.message);
    }
}

async function likePost(postId) {
    try {
        await apiCall(`/posts/${postId}/like`, { method: 'POST' });
        loadPosts();
    } catch (error) {
        alert('Failed to like post: ' + error.message);
    }
}

function displayPosts(posts) {
    const postsContainer = document.getElementById('posts');
    
    if (posts.length === 0) {
        postsContainer.innerHTML = '<p>No posts yet. Be the first to post something!</p>';
        return;
    }

    postsContainer.innerHTML = posts.map(post => {
        const isOwnPost = currentUser && post.userId === currentUser.id;
        const postDate = new Date(post.createdAt).toLocaleDateString();
        
        return `
            <div class="post">
                <div class="post-header">
                    <strong>@${post.username}</strong>
                    <span class="post-date">${postDate}</span>
                </div>
                <div class="post-content">${post.content}</div>
                <div class="post-actions">
                    <button onclick="likePost('${post.id}')" class="like-btn">
                        ❤️ ${post.likes || 0}
                    </button>
                    ${isOwnPost ? `<button onclick="deletePost('${post.id}')" class="delete-btn">🗑️ Delete</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// UI functions
function showLogin() {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('main-section').style.display = 'none';
    document.getElementById('current-user').textContent = '';
}

function showMain() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('main-section').style.display = 'block';
    
    if (currentUser) {
        document.getElementById('current-user').textContent = currentUser.username;
    }
}

function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    // Update tab styling
    document.querySelector('.tab-btn.active').classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
    document.querySelector('.auth-form.active').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
}

function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    // Update tab styling
    document.querySelector('.tab-btn.active').classList.remove('active');
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.querySelector('.auth-form.active').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
}

// Enter key support
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        if (e.target.id === 'content') {
            createPost();
        } else if (e.target.closest('#login-form')) {
            login();
        } else if (e.target.closest('#register-form')) {
            register();
        }
    }
});
