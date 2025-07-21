// Authentication state
let currentUser = null;
let authToken = null;

// Scroll navigation state
let totalPosts = 0;

// Auto-refresh state
let autoRefreshInterval = null;
let lastPostCount = 0;
let lastPostTimestamp = 0;

// Helper function to safely get API URL
function getApiUrl() {
    if (typeof CONFIG === 'undefined') {
        console.warn('CONFIG not loaded, using fallback API URL');
        // Fallback API detection
        const hostname = window.location.hostname;
        if (hostname.includes('.web.app') || hostname.includes('.firebaseapp.com')) {
            return 'https://twitterclone-production-58f6.up.railway.app';
        }
        return 'http://localhost:3000';
    }
    return CONFIG.API_BASE_URL;
}

// CORS-aware fetch function
async function corsAwareFetch(url, options = {}) {
    try {
        // First try direct request
        const response = await fetch(url, {
            ...options,
            mode: 'cors',
            credentials: 'omit' // Remove credentials since Railway doesn't support it with *
        });
        return response;
    } catch (error) {
        if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
            console.warn('CORS error detected, this may be due to Railway backend configuration');
            throw new Error('CORS_ERROR: Cannot connect to backend. Please check server configuration.');
        }
        throw error;
    }
}

// Check for existing session on page load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    
    if (token && username) {
        authToken = token;
        currentUser = username;
        showMainApp();
        loadPosts();
        
        // Start auto-refresh for logged in users
        startAutoRefresh();
        
        // Update timestamps more frequently for real-time experience
        setInterval(() => {
            if (document.getElementById('main-section').classList.contains('active')) {
                updateTimestamps();
            }
        }, 30000); // Update every 30 seconds for better real-time feel
    } else {
        // Start auto-refresh even for non-logged in users (to see public posts)
        startAutoRefresh();
    }
    
    // Initialize post form enhancements
    initializePostForm();
});

// Auto-refresh functionality
function startAutoRefresh() {
    // Clear any existing interval
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Check for new posts every 3 seconds (like Facebook)
    autoRefreshInterval = setInterval(async () => {
        await checkForNewPosts();
    }, 3000);
    
    console.log('Auto-refresh started - posts will update every 3 seconds');
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('Auto-refresh stopped');
    }
}

async function checkForNewPosts() {
    try {
        // Get current posts count from server
        const response = await corsAwareFetch(`${getApiUrl()}/api/posts`);
        if (!response.ok) return;
        
        const posts = await response.json();
        const currentPostCount = posts.length;
        
        // Check if there are new posts
        if (currentPostCount !== lastPostCount || (posts.length > 0 && posts[0].timestamp > lastPostTimestamp)) {
            console.log(`New posts detected! Count: ${lastPostCount} → ${currentPostCount}`);
            
            // Save current scroll position
            const postsContainer = document.getElementById('posts');
            const scrollTop = postsContainer ? postsContainer.scrollTop : 0;
            
            // Reload posts
            await loadPosts();
            
            // Show a subtle notification for new posts
            showNewPostNotification(currentPostCount - lastPostCount);
            
            // Try to maintain scroll position if user was scrolling
            if (postsContainer && scrollTop > 100) {
                setTimeout(() => {
                    postsContainer.scrollTop = scrollTop;
                }, 100);
            }
            
            // Update tracking variables
            lastPostCount = currentPostCount;
            if (posts.length > 0) {
                lastPostTimestamp = posts[0].timestamp;
            }
        }
    } catch (error) {
        console.log('Auto-refresh check failed:', error);
        // Don't show error to user, just log it
    }
}

function showNewPostNotification(newPostsCount) {
    // Only show notification if user is logged in and posts were added
    if (!currentUser || newPostsCount <= 0) return;
    
    // Create or update notification
    let notification = document.getElementById('new-posts-notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'new-posts-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #1da1f2, #0d8bd9);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            box-shadow: 0 4px 15px rgba(29, 161, 242, 0.3);
            font-size: 14px;
            font-weight: 600;
            z-index: 1000;
            transform: translateX(350px);
            transition: all 0.3s ease;
            cursor: pointer;
        `;
        
        notification.onclick = () => {
            // Scroll to top when notification is clicked
            const postsContainer = document.getElementById('posts');
            if (postsContainer) {
                postsContainer.scrollTop = 0;
            }
            hideNewPostNotification();
        };
        
        document.body.appendChild(notification);
    }
    
    notification.innerHTML = `
        <span style="margin-right: 8px;">🔄</span>
        ${newPostsCount} new post${newPostsCount > 1 ? 's' : ''} available
    `;
    
    // Slide in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-hide after 4 seconds
    setTimeout(hideNewPostNotification, 4000);
}

function hideNewPostNotification() {
    const notification = document.getElementById('new-posts-notification');
    if (notification) {
        notification.style.transform = 'translateX(350px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}
function initializePostForm() {
    const textarea = document.getElementById('content');
    const charCount = document.getElementById('char-count');
    const postBtn = document.querySelector('.post-btn');
    
    if (textarea && charCount) {
        // Character counter functionality
        textarea.addEventListener('input', function() {
            const currentLength = this.value.length;
            const maxLength = 280;
            
            charCount.textContent = currentLength;
            
            // Change color based on character count
            if (currentLength > 250) {
                charCount.style.color = '#e74c3c';
                charCount.style.fontWeight = '700';
            } else if (currentLength > 200) {
                charCount.style.color = '#f39c12';
                charCount.style.fontWeight = '600';
            } else {
                charCount.style.color = '#7f8c8d';
                charCount.style.fontWeight = '500';
            }
            
            // Enable/disable post button
            if (postBtn) {
                if (currentLength === 0 || currentLength > maxLength) {
                    postBtn.disabled = true;
                    postBtn.style.opacity = '0.5';
                } else {
                    postBtn.disabled = false;
                    postBtn.style.opacity = '1';
                }
            }
        });
        
        // Initial state
        textarea.dispatchEvent(new Event('input'));
    }
    
    // Add interactive effects to option buttons
    const optionBtns = document.querySelectorAll('.option-btn');
    optionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Add a fun animation when clicked
            this.style.transform = 'scale(0.9)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
}

// Authentication functions
function showLogin() {
    document.getElementById('login-form').classList.add('active');
    document.getElementById('register-form').classList.remove('active');
    document.querySelector('.tab-btn').classList.add('active');
    document.querySelectorAll('.tab-btn')[1].classList.remove('active');
}

function showRegister() {
    document.getElementById('register-form').classList.add('active');
    document.getElementById('login-form').classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
    document.querySelector('.tab-btn').classList.remove('active');
}

async function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }
    
    try {
        const response = await fetch(`${getApiUrl()}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.username;
            
            // Store in localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('username', currentUser);
            
            showMainApp();
            loadPosts();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        alert('Login failed');
    }
}

async function register() {
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();
    
    if (!username || !email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        const response = await fetch(`${getApiUrl()}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.username;
            
            // Store in localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('username', currentUser);
            
            showMainApp();
            loadPosts();
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        alert('Registration failed');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('main-section').classList.remove('active');
    
    // Continue auto-refresh even after logout (for public posts)
    // But hide any notifications
    hideNewPostNotification();
    
    // Clear forms
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('register-username').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
}

function showMainApp() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('main-section').classList.add('active');
    document.getElementById('current-user').textContent = currentUser;
    
    // Start auto-refresh when main app is shown
    startAutoRefresh();
    
    // Initialize post form when main app is shown
    setTimeout(() => {
        initializePostForm();
    }, 100);
}

// Post functions
async function createPost() {
    const content = document.getElementById('content').value.trim();
    
    if (!content) {
        alert('Please enter some content');
        return;
    }
    
    try {
        // Disable post button to prevent double posting
        const postBtn = document.querySelector('.post-btn');
        const originalText = postBtn.innerHTML;
        postBtn.disabled = true;
        postBtn.innerHTML = '<span class="post-btn-icon">⏳</span> Posting...';
        
        const response = await fetch(`${getApiUrl()}/api/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            // Clear form
            document.getElementById('content').value = '';
            
            // Reset character counter
            const charCount = document.getElementById('char-count');
            if (charCount) {
                charCount.textContent = '0';
                charCount.style.color = '#7f8c8d';
                charCount.style.fontWeight = '500';
            }
            
            // Show success feedback
            postBtn.innerHTML = '<span class="post-btn-icon">✅</span> Posted!';
            
            // Immediate reload to show the new post
            await loadPosts();
            
            // Force auto-refresh check to notify other users faster
            setTimeout(checkForNewPosts, 500);
            
            // Reset button after a short delay
            setTimeout(() => {
                postBtn.disabled = false;
                postBtn.innerHTML = originalText;
            }, 1500);
            
        } else {
            const data = await response.json();
            alert(data.error || 'Error creating post');
            
            // Reset button on error
            postBtn.disabled = false;
            postBtn.innerHTML = originalText;
        }
    } catch (error) {
        alert('Error creating post');
        
        // Reset button on error
        const postBtn = document.querySelector('.post-btn');
        postBtn.disabled = false;
        postBtn.innerHTML = originalText;
    }
}

// Helper function to format timestamp based on user's local timezone
function formatTimestamp(timestamp, edited = false, editedAt = null) {
    try {
        // Convert to number if it's a string
        const numericTimestamp = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
        
        // Create date object
        const date = new Date(numericTimestamp);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'unknown time';
        }
        
        const now = new Date();
        const diffInMs = now - date;
        const diffInSeconds = Math.floor(diffInMs / 1000);
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        
        let timeString;
        
        if (diffInSeconds < 30) {
            timeString = 'just now';
        } else if (diffInMinutes < 1) {
            timeString = `${diffInSeconds}s ago`;
        } else if (diffInMinutes < 60) {
            timeString = `${diffInMinutes}m ago`;
        } else if (diffInHours < 24) {
            timeString = `${diffInHours}h ago`;
        } else if (diffInDays < 7) {
            timeString = `${diffInDays}d ago`;
        } else {
            // Show full date for posts older than 7 days
            timeString = date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
        
        // Add edit indicator if edited
        if (edited && editedAt) {
            const editDate = new Date(editedAt);
            if (!isNaN(editDate.getTime())) {
                const editDiffInMs = now - editDate;
                const editDiffInSeconds = Math.floor(editDiffInMs / 1000);
                const editDiffInMinutes = Math.floor(editDiffInMs / (1000 * 60));
                const editDiffInHours = Math.floor(editDiffInMs / (1000 * 60 * 60));
                const editDiffInDays = Math.floor(editDiffInMs / (1000 * 60 * 60 * 24));
                
                let editTimeString;
                if (editDiffInSeconds < 30) {
                    editTimeString = 'just now';
                } else if (editDiffInMinutes < 1) {
                    editTimeString = `${editDiffInSeconds}s ago`;
                } else if (editDiffInMinutes < 60) {
                    editTimeString = `${editDiffInMinutes}m ago`;
                } else if (editDiffInHours < 24) {
                    editTimeString = `${editDiffInHours}h ago`;
                } else if (editDiffInDays < 7) {
                    editTimeString = `${editDiffInDays}d ago`;
                } else {
                    editTimeString = editDate.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
                
                return `${timeString} (edited ${editTimeString})`;
            }
        }
        
        return timeString;
    } catch (error) {
        console.error('Error formatting timestamp:', error);
        return 'time error';
    }
}

// Function to update timestamps without reloading posts
function updateTimestamps() {
    const timeElements = document.querySelectorAll('[data-timestamp]');
    timeElements.forEach(element => {
        const timestamp = element.getAttribute('data-timestamp');
        const edited = element.getAttribute('data-edited') === 'true';
        const editedAt = element.getAttribute('data-edited-at');
        
        const formattedTime = formatTimestamp(timestamp, edited, editedAt);
        // Update just the text after the calendar icon and space
        const svgElement = element.querySelector('svg');
        if (svgElement) {
            element.innerHTML = svgElement.outerHTML + ` 📅 ${formattedTime}`;
        } else {
            element.textContent = `📅 ${formattedTime}`;
        }
    });
}

async function loadPosts() {
    try {
        const response = await fetch(`${getApiUrl()}/api/posts`);
        const posts = await response.json();
        
        const postsContainer = document.getElementById('posts');
        postsContainer.innerHTML = '';
        
        // Update total posts count for scroll navigation
        totalPosts = posts.length;
        
        // Update tracking variables for auto-refresh
        lastPostCount = posts.length;
        if (posts.length > 0) {
            lastPostTimestamp = posts[0].timestamp;
        }
        
        if (posts.length === 0) {
            postsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #657786; background: white; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
                    <h3 style="margin: 0 0 8px 0; color: #14171a;">No posts yet</h3>
                    <p style="margin: 0;">Be the first to share something!</p>
                </div>
            `;
            // Hide scroll navigation when no posts
            return;
        }
        
        posts.forEach((post, index) => {
            // Check if current user owns this post
            const isOwner = post.username === currentUser;
            
            // Ensure timestamp is properly formatted
            const timestampDisplay = post.timestamp ? formatTimestamp(post.timestamp, post.edited, post.editedAt) : 'just now';
            
            const postHTML = `
                <div style="
                    background: white; 
                    border-radius: 15px; 
                    padding: 20px; 
                    margin: 16px 0; 
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
                    border: 1px solid #e1e8ed;
                    transition: all 0.2s ease;
                    position: relative;
                " class="post-card" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'; this.style.transform='translateY(0)'">
                    
                    <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
                        <div style="
                            width: 48px; 
                            height: 48px; 
                            border-radius: 50%; 
                            background: linear-gradient(135deg, #1da1f2, #0d8bd9); 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            color: white; 
                            font-weight: bold; 
                            font-size: 18px;
                            margin-right: 12px;
                            flex-shrink: 0;
                        ">
                            ${post.username.charAt(0).toUpperCase()}
                        </div>
                        
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                <span style="
                                    font-weight: 700; 
                                    color: #14171a; 
                                    font-size: 15px;
                                    margin-right: 8px;
                                ">${post.username}</span>
                                
                                <span style="
                                    color: #657786; 
                                    font-size: 14px;
                                    display: flex;
                                    align-items: center;
                                " 
                                data-timestamp="${post.timestamp}"
                                data-edited="${post.edited || false}"
                                data-edited-at="${post.editedAt || ''}">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;">
                                        <path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zM18 19H6V5h12v14zM8 7h8v2H8V7zm0 4h8v2H8v-2zm0 4h5v2H8v-2z"/>
                                    </svg>
                                    📅 ${timestampDisplay}
                                </span>
                            </div>
                            
                            <div style="
                                color: #14171a; 
                                font-size: 15px; 
                                line-height: 1.5; 
                                word-wrap: break-word;
                                margin-bottom: 16px;
                            ">${post.content}</div>
                            
                            ${isOwner ? `
                                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                    <button id="edit-${post.id}" style="
                                        background: linear-gradient(135deg, #17bf63, #00ba7c);
                                        color: white;
                                        border: none;
                                        border-radius: 20px;
                                        padding: 8px 16px;
                                        font-size: 13px;
                                        font-weight: 600;
                                        cursor: pointer;
                                        display: flex;
                                        align-items: center;
                                        gap: 6px;
                                        transition: all 0.2s ease;
                                        box-shadow: 0 2px 4px rgba(23,191,99,0.3);
                                    " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 8px rgba(23,191,99,0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 4px rgba(23,191,99,0.3)'">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                        </svg>
                                        Edit
                                    </button>
                                    
                                    <button id="delete-${post.id}" style="
                                        background: linear-gradient(135deg, #e1306c, #fd1d1d);
                                        color: white;
                                        border: none;
                                        border-radius: 20px;
                                        padding: 8px 16px;
                                        font-size: 13px;
                                        font-weight: 600;
                                        cursor: pointer;
                                        display: flex;
                                        align-items: center;
                                        gap: 6px;
                                        transition: all 0.2s ease;
                                        box-shadow: 0 2px 4px rgba(225,48,108,0.3);
                                    " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 8px rgba(225,48,108,0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 4px rgba(225,48,108,0.3)'">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                        </svg>
                                        Delete
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            postsContainer.innerHTML += postHTML;
        });
        
        // Add click events for owner's posts only
        posts.forEach((post) => {
            if (post.username === currentUser) {
                const editBtn = document.getElementById(`edit-${post.id}`);
                const deleteBtn = document.getElementById(`delete-${post.id}`);
                
                if (editBtn) {
                    editBtn.onclick = function() {
                        editPost(post.id, post.content);
                    };
                }
                
                if (deleteBtn) {
                    deleteBtn.onclick = function() {
                        deletePost(post.id);
                    };
                }
            }
        });
        
        // Initialize post sidebar scrollbar
        initCustomScrollbar();
        
    } catch (error) {
        console.error('Error loading posts:', error);
        totalPosts = 0;
        const postsContainer = document.getElementById('posts');
        postsContainer.innerHTML = `
            <div style="
                background: #ffebee; 
                border: 1px solid #ffcdd2; 
                border-radius: 15px; 
                padding: 20px; 
                text-align: center;
                color: #c62828;
            ">
                <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
                <strong>Unable to load posts</strong>
                <br>
                <small>Please check your connection and try again.</small>
            </div>
        `;
    }
}

// Edit post function
async function editPost(postId, currentContent) {
    const newContent = prompt('✏️ Edit your post:', currentContent);
    
    if (newContent === null || newContent.trim() === '') {
        return;
    }
    
    try {
        const response = await fetch(`${getApiUrl()}/api/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ content: newContent.trim() })
        });
        
        if (response.ok) {
            loadPosts(); // Refresh posts
        } else {
            const data = await response.json();
            alert('❌ ' + (data.error || 'Error editing post'));
        }
    } catch (error) {
        alert('❌ Error editing post. Please try again.');
    }
}

// Delete post function
async function deletePost(postId) {
    if (!confirm('🗑️ Are you sure you want to delete this post?\n\nThis action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${getApiUrl()}/api/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            loadPosts(); // Refresh posts
        } else {
            const data = await response.json();
            alert('❌ ' + (data.error || 'Error deleting post'));
        }
    } catch (error) {
        alert('❌ Error deleting post. Please try again.');
    }
}

// Post Sidebar Scrollbar Functions (controls posts container only)
function initCustomScrollbar() {
    const postSidebarScrollbar = document.getElementById('post-sidebar-scrollbar');
    const sidebarScrollbarThumb = document.getElementById('sidebar-scrollbar-thumb');
    const sidebarScrollbarTrack = document.querySelector('.sidebar-scrollbar-track');
    const sidebarScrollUpBtn = document.getElementById('sidebar-scroll-up');
    const sidebarScrollDownBtn = document.getElementById('sidebar-scroll-down');
    const postsContainer = document.getElementById('posts'); // The actual posts container
    
    // Check if posts container is scrollable
    function updateScrollbarVisibility() {
        const isScrollable = postsContainer.scrollHeight > postsContainer.clientHeight;
        if (!isScrollable || totalPosts <= 0) {
            postSidebarScrollbar.classList.add('hidden');
            return false;
        }
        postSidebarScrollbar.classList.remove('hidden');
        return true;
    }
    
    // Update thumb position and size based on posts container scroll
    function updateScrollThumb() {
        if (!updateScrollbarVisibility()) return;
        
        const scrollTop = postsContainer.scrollTop;
        const scrollHeight = postsContainer.scrollHeight - postsContainer.clientHeight;
        const trackHeight = sidebarScrollbarTrack.clientHeight;
        
        // Calculate thumb height (proportional to visible content)
        const thumbHeight = Math.max(24, (postsContainer.clientHeight / postsContainer.scrollHeight) * trackHeight);
        
        // Calculate thumb position
        const thumbTop = scrollHeight > 0 ? (scrollTop / scrollHeight) * (trackHeight - thumbHeight) : 0;
        
        sidebarScrollbarThumb.style.height = thumbHeight + 'px';
        sidebarScrollbarThumb.style.top = Math.max(0, Math.min(thumbTop, trackHeight - thumbHeight)) + 'px';
        
        // Update button states
        sidebarScrollUpBtn.disabled = scrollTop <= 0;
        sidebarScrollDownBtn.disabled = scrollTop >= scrollHeight;
    }
    
    // Smooth scroll functions for posts container
    function scrollUp() {
        const scrollAmount = postsContainer.clientHeight * 0.8;
        postsContainer.scrollBy({
            top: -scrollAmount,
            behavior: 'smooth'
        });
    }
    
    function scrollDown() {
        const scrollAmount = postsContainer.clientHeight * 0.8;
        postsContainer.scrollBy({
            top: scrollAmount,
            behavior: 'smooth'
        });
    }
    
    // Event listeners for buttons
    sidebarScrollUpBtn.addEventListener('click', scrollUp);
    sidebarScrollDownBtn.addEventListener('click', scrollDown);
    
    // Draggable thumb functionality
    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;
    
    sidebarScrollbarThumb.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startScrollTop = postsContainer.scrollTop;
        sidebarScrollbarThumb.classList.add('dragging');
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaY = e.clientY - startY;
        const trackHeight = sidebarScrollbarTrack.clientHeight;
        const scrollHeight = postsContainer.scrollHeight - postsContainer.clientHeight;
        const thumbHeight = parseFloat(sidebarScrollbarThumb.style.height);
        
        const scrollRatio = deltaY / (trackHeight - thumbHeight);
        const newScrollTop = startScrollTop + (scrollRatio * scrollHeight);
        
        postsContainer.scrollTop = Math.max(0, Math.min(newScrollTop, scrollHeight));
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            sidebarScrollbarThumb.classList.remove('dragging');
            document.body.style.userSelect = '';
        }
    });
    
    // Click on track to scroll posts container
    sidebarScrollbarTrack.addEventListener('click', (e) => {
        if (e.target === sidebarScrollbarThumb) return;
        
        const rect = sidebarScrollbarTrack.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const trackHeight = sidebarScrollbarTrack.clientHeight;
        const scrollHeight = postsContainer.scrollHeight - postsContainer.clientHeight;
        const thumbHeight = parseFloat(sidebarScrollbarThumb.style.height);
        
        const targetScrollTop = ((clickY - thumbHeight / 2) / (trackHeight - thumbHeight)) * scrollHeight;
        
        postsContainer.scrollTo({
            top: Math.max(0, Math.min(targetScrollTop, scrollHeight)),
            behavior: 'smooth'
        });
    });
    
    // Update on posts container scroll and resize
    postsContainer.addEventListener('scroll', updateScrollThumb);
    window.addEventListener('resize', updateScrollThumb);
    
    // Initial update
    updateScrollThumb();
}

// Scroll Navigation Functions (for posts container)
function scrollToPreviousPost() {
    const postsContainer = document.getElementById('posts');
    const scrollAmount = postsContainer.clientHeight * 0.8;
    postsContainer.scrollBy({
        top: -scrollAmount,
        behavior: 'smooth'
    });
}

function scrollToNextPost() {
    const postsContainer = document.getElementById('posts');
    const scrollAmount = postsContainer.clientHeight * 0.8;
    postsContainer.scrollBy({
        top: scrollAmount,
        behavior: 'smooth'
    });
}

// Keyboard navigation (for posts container)
document.addEventListener('keydown', (event) => {
    // Only handle keyboard navigation when main section is active and no input is focused
    if (document.getElementById('main-section').classList.contains('active') && 
        !['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
        
        const postsContainer = document.getElementById('posts');
        
        switch(event.key) {
            case 'ArrowUp':
            case 'k':
                event.preventDefault();
                scrollToPreviousPost();
                break;
            case 'ArrowDown':
            case 'j':
                event.preventDefault();
                scrollToNextPost();
                break;
            case 'Home':
                event.preventDefault();
                postsContainer.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                break;
            case 'End':
                event.preventDefault();
                postsContainer.scrollTo({
                    top: postsContainer.scrollHeight,
                    behavior: 'smooth'
                });
                break;
        }
    }
});
