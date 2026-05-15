const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:10000/api'
    : 'https://complaints-registration-platform-full-xnkl.onrender.com/api';

let currentUser = null;

// Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    window.scrollTo(0, 0);
}

function updateNav() {
    const navLinks = document.getElementById('nav-links');
    if (currentUser) {
        navLinks.innerHTML = `
            <span>Welcome, <strong>${currentUser.name}</strong></span>
            <a href="#" onclick="logout()">Logout</a>
        `;
    } else {
        navLinks.innerHTML = `
            <a href="#" onclick="showPage('login-page')">Login</a>
            <a href="#" onclick="showPage('register-page')" class="btn btn-primary btn-sm">Register</a>
        `;
    }
}

// API Helpers
async function apiCall(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    const options = {
        method,
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include'
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await res.json();
        if (!res.ok) {
            if (endpoint !== '/auth/me' || res.status !== 401) {
                console.error("❌ Backend Error Data:", data);
            }
            const detail = data.details || data.error || '';
            throw new Error(`${data.message || 'Something went wrong'}: ${detail}`);
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
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (res.status === 401) return;
        
        if (res.ok) {
            currentUser = await res.json();
            updateNav();
            if (currentUser.role === 'admin') showPage('admin-page');
            else showPage('my-complaints-page');
        }
    } catch (err) {
        // Silent
    }
}

async function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    updateNav();
    showPage('login-page');
}

// Form Handlers
document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    try {
        const data = await apiCall('/auth/login', 'POST', { email, password });
        if (data.token) localStorage.setItem('token', data.token);
        currentUser = data.user;
        updateNav();
        if (currentUser.role === 'admin') showPage('admin-page');
        else showPage('my-complaints-page');
    } catch (err) {
        errorEl.textContent = err.message;
    }
};

document.getElementById('register-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;

    try {
        const data = await apiCall('/auth/send-otp', 'POST', { name, email });
        
        // --- BYPASS RENDER BLOCK: Send via EmailJS ---
        console.log("📤 Sending OTP via EmailJS Bypass...");
        try {
            await emailjs.send("service_qyvuqcs", "template_ht3fkqo", {
                to_email: email, 
                email: email,    
                user_email: email,
                otp: data.otp,
            });
            console.log("🚀 Email sent successfully via Browser!");
        } catch (emailErr) {
            console.error("❌ EmailJS ERROR:", emailErr);
            alert("Email delivery failed: " + JSON.stringify(emailErr));
        }
        // ----------------------------------------------

        document.getElementById('reg-step-1').classList.add('hidden');
        document.getElementById('reg-step-2').classList.remove('hidden');
    } catch (err) {
        alert(err.message);
    }
};

document.getElementById('verify-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const otp = document.getElementById('reg-otp').value;
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    if (password !== confirm) return alert("Passwords do not match");

    try {
        const data = await apiCall('/auth/register', 'POST', { email, otp, password });
        if (data.token) localStorage.setItem('token', data.token);
        alert("Registration successful!");
        showPage('login-page');
    } catch (err) {
        alert(err.message);
    }
};

// Complaint Actions
document.getElementById('btn-ask-ai').onclick = async () => {
    const text = document.getElementById('comp-description').value;
    if (!text) return alert("Please describe the issue first");

    try {
        const question = await apiCall('/ai/question', 'POST', { complaintText: text });
        document.getElementById('ai-question-text').textContent = question;
        document.getElementById('ai-followup-box').classList.remove('hidden');
    } catch (err) {
        alert(err.message);
    }
};

document.getElementById('complaint-form').onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('comp-title').value;
    const description = document.getElementById('comp-description').value;
    const aiQuestion = document.getElementById('ai-question-text').textContent;
    const userAnswer = document.getElementById('ai-answer').value;

    try {
        await apiCall('/complaints', 'POST', { title, description, aiQuestion, userAnswer });
        alert("Complaint submitted successfully!");
        showPage('my-complaints-page');
        loadMyComplaints();
    } catch (err) {
        alert(err.message);
    }
};

async function loadMyComplaints() {
    try {
        const complaints = await apiCall('/complaints/my');
        const list = document.getElementById('complaints-list');
        list.innerHTML = complaints.map(c => renderComplaint(c)).join('');
    } catch (err) {
        console.error(err);
    }
}

async function loadAllComplaints() {
    try {
        const complaints = await apiCall('/complaints/admin');
        const list = document.getElementById('admin-complaints-list');
        list.innerHTML = complaints.map(c => renderComplaint(c, true)).join('');
    } catch (err) {
        console.error(err);
    }
}

function renderComplaint(c, showUser = false) {
    return `
        <div class="complaint-item">
            ${showUser ? `<div class="user-info"><strong>User:</strong> ${c.userId}</div>` : ''}
            <div class="comp-id">ID: ${c.id.substring(0, 8)}...</div>
            <div class="comp-title">${c.title}</div>
            <div class="comp-desc">${c.description}</div>
            <div class="ai-followup-result">
                <div class="ai-label" style="color: var(--accent); font-size: 0.8rem; margin-bottom: 0.3rem;">AI Follow-up</div>
                <div style="font-weight: 600; margin-bottom: 0.5rem;">${c.aiQuestion}</div>
                <div class="ai-label" style="color: var(--text-muted); margin-top: 1rem;">User's Answer</div>
                <div style="color: var(--text-main)">${c.userAnswer || 'No answer provided'}</div>
            </div>
        </div>
    `;
}

// Init
(async () => {
    await checkSession();
    if (!currentUser) showPage('login-page');
    else if (currentUser.role === 'admin') loadAllComplaints();
    else loadMyComplaints();
})();

// Nav listeners
document.getElementById('go-to-register').onclick = () => showPage('register-page');
document.getElementById('go-to-login').onclick = () => showPage('login-page');
document.getElementById('btn-new-complaint').onclick = () => showPage('submit-complaint-page');
