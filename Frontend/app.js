const API_BASE = "http://127.0.0.1:3010/api";
console.log("🚀 FRONTEND CONNECTED TO:", API_BASE);

// State
let currentUser = null;

// DOM Elements
const pages = document.querySelectorAll('.page');
const navLinks = document.getElementById('nav-links');

// Navigation Helpers
function showPage(pageId) {
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'my-complaints-page') loadMyComplaints();
    if (pageId === 'admin-page') loadAllComplaints();
}

function updateNav() {
    if (currentUser) {
        navLinks.innerHTML = `
            <span style="margin-right: 1rem; color: var(--text-muted)">Hi, ${currentUser.name}</span>
            <button class="btn btn-outline" id="btn-logout">Logout</button>
        `;
        document.getElementById('btn-logout').onclick = logout;
    } else {
        navLinks.innerHTML = `
            <button class="btn btn-outline" id="nav-login">Login</button>
        `;
        document.getElementById('nav-login').onclick = () => showPage('login-page');
    }
}

// API Helpers
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' // Send cookies
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await res.json();
        if (!res.ok) {
            // Show the detailed error if the backend provided one
            const detail = data.error ? `: ${data.error}` : '';
            throw new Error((data.message || 'Something went wrong') + detail);
        }
        return data;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

// Auth Actions
async function checkSession() {
    try {
        currentUser = await apiCall('/auth/me');
        updateNav();
        if (currentUser.role === 'admin') {
            showPage('admin-page');
        } else {
            showPage('my-complaints-page');
        }
    } catch (err) {
        currentUser = null;
        updateNav();
        showPage('login-page');
    }
}

async function logout() {
    await apiCall('/auth/logout', 'POST');
    currentUser = null;
    updateNav();
    showPage('login-page');
}

// Form Handlers

// Login
document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    try {
        currentUser = await apiCall('/auth/login', 'POST', { email, password });
        updateNav();
        if (currentUser.role === 'admin') showPage('admin-page');
        else showPage('my-complaints-page');
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
    }
};

// Register - Step 1: Send OTP
document.getElementById('otp-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const errorEl = document.getElementById('reg-error');
    
    try {
        await apiCall('/auth/send-otp', 'POST', { name, email });
        document.getElementById('reg-step-1').classList.add('hidden');
        document.getElementById('reg-step-2').classList.remove('hidden');
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
    }
};

// Register - Step 2: Verify & Password
document.getElementById('verify-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const otp = document.getElementById('reg-otp').value;
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm-password').value;
    const errorEl = document.getElementById('verify-error');

    if (password !== confirm) {
        errorEl.textContent = "Passwords do not match";
        errorEl.style.display = 'block';
        return;
    }
    
    try {
        await apiCall('/auth/register', 'POST', { email, otp, password });
        alert("Registration successful! Please login.");
        showPage('login-page');
        document.getElementById('reg-step-2').classList.add('hidden');
        document.getElementById('reg-step-1').classList.remove('hidden');
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
    }
};

// Complaint Flow
let currentAIQuestion = "";

document.getElementById('btn-get-ai').onclick = async () => {
    const text = document.getElementById('complaint-text').value;
    const errorEl = document.getElementById('complaint-error');
    if (!text) return;

    try {
        const btn = document.getElementById('btn-get-ai');
        btn.disabled = true;
        btn.innerHTML = '<span class="loader"></span> Analyzing...';

        const data = await apiCall('/ai/question', 'POST', { complaint_text: text });
        currentAIQuestion = data.question;
        document.getElementById('ai-question-text').textContent = currentAIQuestion;
        
        document.getElementById('complaint-step-1').classList.add('hidden');
        document.getElementById('complaint-step-2').classList.remove('hidden');
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
    } finally {
        const btn = document.getElementById('btn-get-ai');
        btn.disabled = false;
        btn.textContent = 'Continue';
    }
};

document.getElementById('btn-final-submit').onclick = async () => {
    const text = document.getElementById('complaint-text').value;
    const answer = document.getElementById('ai-answer').value;
    const errorEl = document.getElementById('complaint-error');

    try {
        await apiCall('/complaints', 'POST', {
            complaint_text: text,
            ai_question: currentAIQuestion,
            ai_answer: answer
        });
        showPage('my-complaints-page');
        // Reset form
        document.getElementById('complaint-text').value = "";
        document.getElementById('ai-answer').value = "";
        document.getElementById('complaint-step-2').classList.add('hidden');
        document.getElementById('complaint-step-1').classList.remove('hidden');
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
    }
};

// Data Loading
async function loadMyComplaints() {
    const list = document.getElementById('my-complaints-list');
    list.innerHTML = '<p style="text-align:center; color:var(--text-muted)">Loading your complaints...</p>';
    
    try {
        const data = await apiCall('/complaints/my');
        if (data.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top: 2rem;">No complaints yet. Speak up!</p>';
            return;
        }
        list.innerHTML = data.map(c => renderComplaint(c)).join('');
    } catch (err) {
        list.innerHTML = '<p style="color:var(--error)">Failed to load complaints.</p>';
    }
}

async function loadAllComplaints() {
    const list = document.getElementById('admin-complaints-list');
    list.innerHTML = '<p style="text-align:center; color:var(--text-muted)">Loading all complaints...</p>';
    
    try {
        const data = await apiCall('/admin/complaints');
        list.innerHTML = data.map(c => renderComplaint(c, true)).join('');
    } catch (err) {
        list.innerHTML = '<p style="color:var(--error)">Failed to load complaints.</p>';
    }
}

function renderComplaint(c, showUser = false) {
    return `
        <div class="complaint-item">
            ${showUser ? `
                <div class="user-info">
                    <strong>User:</strong> ${c.userName} (${c.userEmail})
                </div>
            ` : ''}
            <div class="user-info">
                <strong>Date:</strong> ${new Date(c.created_at).toLocaleDateString()}
            </div>
            <div class="complaint-text">${c.complaintText}</div>
            <div class="ai-section">
                <div class="ai-label">AI Follow-up</div>
                <div style="font-weight: 600; margin-bottom: 0.5rem;">${c.aiQuestion}</div>
                <div class="ai-label" style="color: var(--text-muted); margin-top: 1rem;">User's Answer</div>
                <div style="color: var(--text-main)">${c.userAnswer || 'No answer provided'}</div>
            </div>
        </div>
    `;
}

// Navigation Events
document.getElementById('go-to-register').onclick = (e) => { e.preventDefault(); showPage('register-page'); };
document.getElementById('go-to-login').onclick = (e) => { e.preventDefault(); showPage('login-page'); };
document.getElementById('btn-new-complaint').onclick = () => showPage('submit-complaint-page');

// Init
checkSession();
