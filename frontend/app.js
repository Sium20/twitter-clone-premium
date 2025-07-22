// Configuration
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

const currentConfig = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? CONFIG.development : CONFIG.production;
const API_BASE_URL = currentConfig.API_BASE_URL;

// Global state
let currentUser = null;
let currentToken = localStorage.getItem('token');
let autoReloadInterval = null;

// Loading functions
function showLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
}

// Initialize app - LOAD POSTS ONLY FOR AUTHENTICATED USERS
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 App starting...');
    showLoading();
    
    // Handle authentication first
    if (currentToken) {
        try {
            await loadProfile(); // This will load posts for authenticated users
        } catch (error) {
            showLogin(); // No posts for guests
        }
    } else {
        showLogin(); // No posts for guests
    }
    
    hideLoading();
});

// API function
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

    const response = await fetch(url, config);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        
        if (response.status === 401) {
            currentToken = null;
            currentUser = null;
            localStorage.removeItem('token');
            
            if (!endpoint.includes('/login') && !endpoint.includes('/register')) {
                showLogin();
            }
        }
        
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
    }
    
    return await response.json();
}

// Authentication functions
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
    const data = await apiCall('/profile');
    currentUser = data.user;
    showMain(); // This will load posts for authenticated users
}

// Post functions
async function createPost() {
    const content = document.getElementById('content').value;
    const postButton = document.querySelector('.post-btn');
    
    if (!currentToken || !currentUser) {
        alert('You need to be logged in to create posts.');
        showLogin();
        return;
    }
    
    if (!content.trim()) {
        alert('Please enter some content');
        return;
    }
    
    if (content.length > 280) {
        alert('Post is too long! Maximum 280 characters allowed.');
        return;
    }

    const originalText = postButton.textContent;
    postButton.textContent = 'Posting...';
    postButton.disabled = true;

    try {
        await apiCall('/posts', {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        
        document.getElementById('content').value = '';
        
        // Reset character counter
        const charCount = document.getElementById('char-count');
        if (charCount) {
            charCount.textContent = '0';
            charCount.style.color = '#7f8c8d';
        }
        
        // Reload posts to show new post
        setTimeout(async () => {
            await loadPosts();
        }, 500);
        
    } catch (error) {
        alert('Failed to create post: ' + error.message);
    } finally {
        postButton.textContent = originalText;
        postButton.disabled = false;
    }
}

// MAIN POSTS LOADING FUNCTION - WORKS FOR EVERYONE
async function loadPosts() {
    try {
        console.log('📡 Loading posts from:', `${API_BASE_URL}/api/posts`);
        
        // Use direct fetch for public endpoint - NO AUTHENTICATION NEEDED
        const response = await fetch(`${API_BASE_URL}/api/posts`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const posts = await response.json();
        console.log('✅ Posts received:', posts.length);
        
        if (!Array.isArray(posts)) {
            throw new Error('Invalid posts data format');
        }
        
        displayPosts(posts);
        
    } catch (error) {
        console.error('❌ Failed to load posts:', error);
        
        const postsContainer = document.getElementById('posts');
        if (postsContainer) {
            postsContainer.innerHTML = '<div class="error-state"><h3>Failed to load posts</h3><p>' + error.message + '</p><button onclick="loadPosts()">Try Again</button></div>';
        }
    }
}

// Edit and Delete functions
async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) {
        return;
    }

    try {
        await apiCall(`/posts/${postId}`, { method: 'DELETE' });
        
        // Reload posts to show updated list
        setTimeout(async () => {
            await loadPosts();
        }, 500);
        
    } catch (error) {
        alert('Failed to delete post: ' + error.message);
    }
}

function editPost(postId, currentContent) {
    // Pause auto-reload while editing
    stopAutoReload();
    console.log('⏸️ Auto-reload paused for editing');
    
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
    
    // Resume auto-reload after cancelling edit
    if (currentUser && currentToken) {
        startAutoReload();
        console.log('▶️ Auto-reload resumed after cancel');
    }
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
        
        // Resume auto-reload after successful save
        if (currentUser && currentToken) {
            startAutoReload();
            console.log('▶️ Auto-reload resumed after save');
        }
        
        // Reload posts to show updates
        setTimeout(async () => {
            await loadPosts();
        }, 500);
        
    } catch (error) {
        alert('Failed to update post: ' + error.message);
    }
}

// DISPLAY POSTS FUNCTION
function displayPosts(posts) {
    console.log('🎨 Displaying posts:', posts.length);
    const postsContainer = document.getElementById('posts');
    
    if (!postsContainer) {
        console.error('❌ Posts container not found!');
        return;
    }
    
    if (posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="empty-posts-state">
                <div class="empty-posts-icon">📝</div>
                <h3 class="empty-posts-title">No posts yet</h3>
                <p class="empty-posts-description">Be the first to share something amazing!</p>
            </div>
        `;
        return;
    }

    const postsHTML = posts.map(post => {
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
    
    postsContainer.innerHTML = postsHTML;
    console.log('✅ Posts displayed successfully');
    
    // Initialize sidebar scrollbar after posts are displayed
    initializeSidebarScrollbar();
}

// UI functions - POSTS ONLY FOR LOGGED-IN USERS
function showLogin() {
    console.log('🔑 Showing login - HIDING POSTS FOR GUEST USERS');
    
    // Show auth section
    document.getElementById('auth-section').style.display = 'block';
    
    // Hide main section completely for guest users
    const mainSection = document.getElementById('main-section');
    mainSection.classList.remove('active');
    mainSection.style.display = 'none';
    
    // Clear posts container for guest users
    const postsContainer = document.getElementById('posts');
    if (postsContainer) {
        postsContainer.innerHTML = '';
    }
    
    stopAutoReload();
}

function showMain() {
    document.getElementById('auth-section').style.display = 'none';
    
    // Show main section for authenticated users
    const mainSection = document.getElementById('main-section');
    mainSection.classList.add('active');
    mainSection.style.display = 'block';
    
    // Show post creation form for authenticated users
    const postForm = document.querySelector('.post-form');
    if (postForm) {
        postForm.style.display = 'block';
    }
    
    // Show user info section for authenticated users
    const userInfo = document.querySelector('.user-info');
    if (userInfo) {
        userInfo.style.display = 'flex';
    }
    
    if (currentUser) {
        document.getElementById('current-user').textContent = currentUser.username;
    }
    
    // Load posts for authenticated users only
    loadPosts();
    
    setupCharacterCounter();
    startAutoReload();
}

// Character counter
function setupCharacterCounter() {
    const textarea = document.getElementById('content');
    const charCount = document.getElementById('char-count');
    
    if (textarea && charCount) {
        function updateCharCount() {
            const count = textarea.value.length;
            charCount.textContent = count;
            
            if (count > 280) {
                charCount.style.color = '#e74c3c';
                charCount.style.fontWeight = 'bold';
            } else if (count > 250) {
                charCount.style.color = '#f39c12';
                charCount.style.fontWeight = '600';
            } else {
                charCount.style.color = '#7f8c8d';
                charCount.style.fontWeight = '500';
            }
        }
        
        textarea.addEventListener('input', updateCharCount);
        updateCharCount();
    }
}

// Auto-reload system
function startAutoReload() {
    if (autoReloadInterval) {
        clearInterval(autoReloadInterval);
    }
    
    autoReloadInterval = setInterval(async () => {
        try {
            await loadPosts();
        } catch (error) {
            console.error('Auto-reload failed:', error);
        }
    }, 5000); // Check every 5 seconds
    
    // Update UI to show auto-reload is active
    updateAutoReloadStatus(true);
}

function stopAutoReload() {
    if (autoReloadInterval) {
        clearInterval(autoReloadInterval);
        autoReloadInterval = null;
    }
    
    // Update UI to show auto-reload is paused
    updateAutoReloadStatus(false);
}

// Update auto-reload status indicator
function updateAutoReloadStatus(isActive) {
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        if (isActive) {
            refreshBtn.title = 'Auto-refresh active (5s) - Click to refresh now';
            refreshBtn.style.opacity = '1';
        } else {
            refreshBtn.title = 'Auto-refresh paused - Click to refresh manually';
            refreshBtn.style.opacity = '0.7';
        }
    }
}

// Manual refresh
async function manualRefresh() {
    const refreshBtn = document.querySelector('.refresh-btn');
    const refreshIcon = document.querySelector('.refresh-icon');
    
    showLoading();
    if (refreshBtn) refreshBtn.disabled = true;
    if (refreshIcon) refreshIcon.style.animation = 'spin 1s linear infinite';
    
    try {
        await loadPosts();
        await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
        console.error('Manual refresh failed:', error);
        alert('Failed to refresh posts. Please try again.');
    } finally {
        hideLoading();
        if (refreshBtn) refreshBtn.disabled = false;
        if (refreshIcon) refreshIcon.style.animation = '';
    }
}

// Tab switching
function showRegister() {
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
    
    document.querySelector('.tab-btn.active').classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
}

function showLoginForm() {
    document.getElementById('register-form').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
    
    document.querySelector('.tab-btn.active').classList.remove('active');
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
}

// Enter key support
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        if (e.target.id === 'content') {
            if (e.ctrlKey || !e.shiftKey) {
                e.preventDefault();
                const content = e.target.value.trim();
                if (content) {
                    createPost();
                }
            }
        } else if (e.target.closest('#login-form') && !e.shiftKey) {
            e.preventDefault();
            login();
        } else if (e.target.closest('#register-form') && !e.shiftKey) {
            e.preventDefault();
            register();
        }
    }
});

// Debug functions
window.testAPI = async function() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/posts`);
        const data = await response.json();
        console.log('✅ API Response:', data);
        displayPosts(data);
        return data;
    } catch (error) {
        console.error('❌ API Error:', error);
        return error;
    }
};

// Sidebar Scrollbar Functionality
function initializeSidebarScrollbar() {
    const postsContainer = document.querySelector('.posts-feed');
    const sidebarScrollbar = document.getElementById('post-sidebar-scrollbar');
    const scrollbarThumb = document.getElementById('sidebar-scrollbar-thumb');
    const scrollUpBtn = document.getElementById('sidebar-scroll-up');
    const scrollDownBtn = document.getElementById('sidebar-scroll-down');
    const scrollbarTrack = document.querySelector('.sidebar-scrollbar-track');

    if (!postsContainer || !sidebarScrollbar || !scrollbarThumb) {
        console.log('📋 Sidebar elements not found, skipping initialization');
        return;
    }

    let isDragging = false;
    let dragStartY = 0;
    let thumbStartY = 0;

    // Function to update scrollbar position based on posts container scroll
    function updateScrollbarPosition() {
        const { scrollTop, scrollHeight, clientHeight } = postsContainer;
        
        if (scrollHeight <= clientHeight) {
            // Hide sidebar if content doesn't overflow
            sidebarScrollbar.classList.add('hidden');
            return;
        } else {
            sidebarScrollbar.classList.remove('hidden');
        }

        const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
        const trackHeight = scrollbarTrack.clientHeight;
        const thumbHeight = Math.max(30, (clientHeight / scrollHeight) * trackHeight);
        const thumbPosition = scrollPercentage * (trackHeight - thumbHeight);

        scrollbarThumb.style.height = `${thumbHeight}px`;
        scrollbarThumb.style.top = `${thumbPosition}px`;

        // Update scroll buttons state
        scrollUpBtn.disabled = scrollTop <= 0;
        scrollDownBtn.disabled = scrollTop >= scrollHeight - clientHeight;
    }

    // Function to scroll posts container based on thumb position
    function scrollToThumbPosition(thumbY) {
        const trackHeight = scrollbarTrack.clientHeight;
        const thumbHeight = scrollbarThumb.clientHeight;
        const maxThumbY = trackHeight - thumbHeight;
        const clampedThumbY = Math.max(0, Math.min(maxThumbY, thumbY));
        
        const scrollPercentage = clampedThumbY / maxThumbY;
        const maxScrollTop = postsContainer.scrollHeight - postsContainer.clientHeight;
        const newScrollTop = scrollPercentage * maxScrollTop;
        
        postsContainer.scrollTop = newScrollTop;
    }

    // Event listeners for posts container scroll
    postsContainer.addEventListener('scroll', updateScrollbarPosition);

    // Thumb drag functionality
    scrollbarThumb.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartY = e.clientY;
        thumbStartY = scrollbarThumb.offsetTop;
        scrollbarThumb.classList.add('dragging');
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaY = e.clientY - dragStartY;
        const newThumbY = thumbStartY + deltaY;
        scrollToThumbPosition(newThumbY);
        e.preventDefault();
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            scrollbarThumb.classList.remove('dragging');
            document.body.style.userSelect = '';
        }
    });

    // Track click functionality
    scrollbarTrack.addEventListener('click', (e) => {
        if (e.target === scrollbarThumb) return;
        
        const trackRect = scrollbarTrack.getBoundingClientRect();
        const clickY = e.clientY - trackRect.top;
        const thumbHeight = scrollbarThumb.clientHeight;
        const newThumbY = clickY - thumbHeight / 2;
        
        scrollToThumbPosition(newThumbY);
    });

    // Scroll buttons functionality
    scrollUpBtn.addEventListener('click', () => {
        postsContainer.scrollBy({ top: -100, behavior: 'smooth' });
    });

    scrollDownBtn.addEventListener('click', () => {
        postsContainer.scrollBy({ top: 100, behavior: 'smooth' });
    });

    // Touch support for mobile
    let touchStartY = 0;
    let thumbTouchStartY = 0;

    scrollbarThumb.addEventListener('touchstart', (e) => {
        isDragging = true;
        touchStartY = e.touches[0].clientY;
        thumbTouchStartY = scrollbarThumb.offsetTop;
        scrollbarThumb.classList.add('dragging');
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        const deltaY = e.touches[0].clientY - touchStartY;
        const newThumbY = thumbTouchStartY + deltaY;
        scrollToThumbPosition(newThumbY);
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            scrollbarThumb.classList.remove('dragging');
        }
    });

    // Keyboard navigation
    postsContainer.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowUp':
                postsContainer.scrollBy({ top: -50, behavior: 'smooth' });
                e.preventDefault();
                break;
            case 'ArrowDown':
                postsContainer.scrollBy({ top: 50, behavior: 'smooth' });
                e.preventDefault();
                break;
            case 'Home':
                postsContainer.scrollTo({ top: 0, behavior: 'smooth' });
                e.preventDefault();
                break;
            case 'End':
                postsContainer.scrollTo({ top: postsContainer.scrollHeight, behavior: 'smooth' });
                e.preventDefault();
                break;
        }
    });

    // Initialize scrollbar position
    updateScrollbarPosition();
    
    console.log('🎯 Sidebar scrollbar initialized successfully');
}
