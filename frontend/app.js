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

// Detect environment - Always use production for Firebase deployment
const currentConfig = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? CONFIG.development : CONFIG.production;
const API_BASE_URL = currentConfig.API_BASE_URL;

// Global state
let currentUser = null;
let currentToken = localStorage.getItem('token');
let lastPostCount = 0;
let autoReloadInterval = null;

// Loading functions
function showLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
        // Prevent scrolling when loading
        document.body.style.overflow = 'hidden';
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
        // Restore scrolling
        document.body.style.overflow = 'auto';
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Show loading on initial page load
    showLoading();
    
    // Check if user is already logged in
    if (currentToken) {
        loadProfile();
    } else {
        hideLoading();
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
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
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

    showLoading();
    try {
        const data = await apiCall('/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });

        currentToken = data.token;
        currentUser = data.user;
        localStorage.setItem('token', currentToken);
        
        showMain();
        await loadPosts();
        hideLoading();
    } catch (error) {
        hideLoading();
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

    showLoading();
    try {
        const data = await apiCall('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        currentToken = data.token;
        currentUser = data.user;
        localStorage.setItem('token', currentToken);
        
        showMain();
        await loadPosts();
        hideLoading();
    } catch (error) {
        hideLoading();
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
        await loadPosts();
        hideLoading();
    } catch (error) {
        console.error('Profile load failed:', error);
        hideLoading();
        logout();
    }
}

// Post functions
async function createPost() {
    const content = document.getElementById('content').value;
    const postButton = document.querySelector('#post-form button');
    
    if (!content.trim()) {
        alert('Please enter some content');
        return;
    }

    // Show loading state on button
    const originalText = postButton.textContent;
    postButton.textContent = 'Posting...';
    postButton.disabled = true;

    try {
        await apiCall('/posts', {
            method: 'POST',
            body: JSON.stringify({ content })
        });

        document.getElementById('content').value = '';
        loadPosts();
    } catch (error) {
        alert('Failed to create post: ' + error.message);
    } finally {
        // Restore button state
        postButton.textContent = originalText;
        postButton.disabled = false;
    }
}

// Manual refresh function
async function manualRefresh() {
    const refreshBtn = document.querySelector('.refresh-btn');
    const refreshIcon = document.querySelector('.refresh-icon');
    
    // Show loading state
    showLoading();
    refreshBtn.disabled = true;
    refreshIcon.style.animation = 'spin 1s linear infinite';
    
    try {
        await loadPosts();
        
        // Brief delay to show the loading effect
        await new Promise(resolve => setTimeout(resolve, 500));
        
    } catch (error) {
        console.error('Manual refresh failed:', error);
        alert('Failed to refresh posts. Please try again.');
    } finally {
        // Hide loading and restore button state
        hideLoading();
        refreshBtn.disabled = false;
        refreshIcon.style.animation = '';
    }
}

async function loadPosts() {
    try {
        const posts = await apiCall('/posts');
        displayPosts(posts);
        
        // Check for new posts and show notification
        if (lastPostCount > 0 && posts.length > lastPostCount) {
            showNewPostNotification(posts.length - lastPostCount);
        }
        lastPostCount = posts.length;
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

function editPost(postId, currentContent) {
    // Hide the content and show the edit form
    document.getElementById(`content-${postId}`).style.display = 'none';
    document.getElementById(`edit-form-${postId}`).style.display = 'block';
    
    // Focus on the textarea
    const textarea = document.getElementById(`edit-content-${postId}`);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function cancelEdit(postId) {
    // Show the content and hide the edit form
    document.getElementById(`content-${postId}`).style.display = 'block';
    document.getElementById(`edit-form-${postId}`).style.display = 'none';
    
    // Reset textarea content to original
    const originalContent = document.getElementById(`content-${postId}`).textContent;
    document.getElementById(`edit-content-${postId}`).value = originalContent;
}

async function savePost(postId) {
    const newContent = document.getElementById(`edit-content-${postId}`).value.trim();
    
    if (!newContent) {
        alert('Post content cannot be empty!');
        return;
    }
    
    if (newContent.length > 280) {
        alert('Post content must be 280 characters or less!');
        return;
    }
    
    try {
        await apiCall(`/posts/${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ content: newContent })
        });
        
        // Update the displayed content
        document.getElementById(`content-${postId}`).textContent = newContent;
        
        // Hide edit form and show content
        cancelEdit(postId);
        
        // Optionally reload posts to get fresh data
        loadPosts();
    } catch (error) {
        alert('Failed to update post: ' + error.message);
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
        postsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #8899a6; font-size: 18px;">
                <div style="font-size: 48px; margin-bottom: 20px;">📝</div>
                <p>No posts yet. Be the first to share something amazing!</p>
            </div>
        `;
        return;
    }

    postsContainer.innerHTML = posts.map(post => {
        const isOwnPost = currentUser && post.userId === currentUser.id;
        const postDate = new Date(post.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const userInitial = post.username.charAt(0).toUpperCase();
        
        return `
            <div class="post" id="post-${post.id}">
                <div class="post-header">
                    <div class="post-user-info">
                        <div class="post-avatar">${userInitial}</div>
                        <div>
                            <div class="username">${post.username}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <span class="timestamp">${postDate}</span>
                        ${isOwnPost ? `
                            <div class="post-actions">
                                <button onclick="editPost('${post.id}', '${post.content.replace(/'/g, "\\'")}')" class="edit-btn">
                                    <span>✏️</span> Edit
                                </button>
                                <button onclick="deletePost('${post.id}')" class="delete-btn">
                                    <span>🗑️</span> Delete
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="post-content" id="content-${post.id}">${post.content}</div>
                <div class="edit-post-form" id="edit-form-${post.id}" style="display: none;">
                    <textarea id="edit-content-${post.id}" placeholder="What's on your mind?">${post.content}</textarea>
                    <div class="edit-form-actions">
                        <button onclick="savePost('${post.id}')" class="save-btn">
                            <span>💾</span> Save
                        </button>
                        <button onclick="cancelEdit('${post.id}')" class="cancel-btn">
                            <span>❌</span> Cancel
                        </button>
                    </div>
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
    
    // Stop auto-reload when logged out
    stopAutoReload();
}

function showMain() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('main-section').style.display = 'block';
    
    if (currentUser) {
        document.getElementById('current-user').textContent = currentUser.username;
    }
    
    // Start auto-reload system
    startAutoReload();
}

// Auto-reload system functions
function startAutoReload() {
    // Clear any existing interval
    if (autoReloadInterval) {
        clearInterval(autoReloadInterval);
    }
    
    // Check for new posts every 5 seconds
    autoReloadInterval = setInterval(async () => {
        try {
            const posts = await apiCall('/posts');
            if (posts.length > lastPostCount) {
                showNewPostNotification(posts.length - lastPostCount);
                // Auto-reload posts
                displayPosts(posts);
                lastPostCount = posts.length;
            }
        } catch (error) {
            console.error('Auto-reload failed:', error);
        }
    }, 5000);
}

function stopAutoReload() {
    if (autoReloadInterval) {
        clearInterval(autoReloadInterval);
        autoReloadInterval = null;
    }
}

function showNewPostNotification(newPostCount) {
    // Remove existing notification if any
    const existingNotification = document.getElementById('new-posts-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.id = 'new-posts-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #1da1f2, #0d8bd9);
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        box-shadow: 0 8px 25px rgba(29, 161, 242, 0.3);
        z-index: 1000;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    const plural = newPostCount > 1 ? 's' : '';
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span>🔄</span>
            <span>${newPostCount} new post${plural} available</span>
            <span style="font-size: 12px; opacity: 0.8;">• Click to refresh</span>
        </div>
    `;
    
    // Add click handler to refresh
    notification.addEventListener('click', () => {
        loadPosts();
        notification.remove();
    });
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.remove();
        }
    }, 10000);
}

function showRegister() {
    // Hide login form and show register form
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
    
    // Update tab styling
    document.querySelector('.tab-btn.active').classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
}

function showLoginForm() {
    // Hide register form and show login form
    document.getElementById('register-form').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
    
    // Update tab styling
    document.querySelector('.tab-btn.active').classList.remove('active');
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
}

// Enter key support
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        if (e.target.id === 'content' || e.target.closest('.post-form')) {
            e.preventDefault(); // Prevent default behavior
            createPost();
        } else if (e.target.closest('#login-form')) {
            login();
        } else if (e.target.closest('#register-form')) {
            register();
        }
    }
});
