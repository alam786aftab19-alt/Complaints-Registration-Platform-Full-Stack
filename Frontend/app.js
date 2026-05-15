const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:10000/api'
    : 'https://complaints-registration-platform-full-xnkl.onrender.com/api';

let currentUser = null;

// Navigation
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active')); // Use 'active' from your CSS
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active'); // Use 'active' from your CSS
    window.scrollTo(0, 0);
}

function updateNav() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;
    if (currentUser) {
        navLinks.innerHTML = `
            <span>Welcome, <strong>${currentUser.name}</strong></span>
            <a href="#" id="logout-btn">Logout</a>
        `;
        document.getElementById('logout-btn').onclick = (e) => {
            e.preventDefault();
            logout();
        };
    } else {
        navLinks.innerHTML = `
            <a href="#" id="nav-login">Login</a>
            <a href="#" id="nav-register" class="btn btn-primary btn-sm">Register</a>
        `;
        document.getElementById('nav-login').onclick = (e) => {
            e.preventDefault();
            showPage('login-page');
        };
        document.getElementById('nav-register').onclick = (e) => {
            e.preventDefault();
            showPage('register-page');
        };
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
            throw new Error(data.message || 'Something went wrong');
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
        if (!token) return;
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            currentUser = await res.json();
            updateNav();
        }
    } catch (err) {
        console.log("Not logged in");
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
    try {
        const data = await apiCall('/auth/login', 'POST', { email, password });
        if (data.token) localStorage.setItem('token', data.token);
        currentUser = data.user;
        updateNav();
        if (currentUser.role === 'admin') {
            showPage('admin-page');
            loadAllComplaints();
        } else {
            showPage('my-complaints-page');
            loadMyComplaints();
        }
    } catch (err) {
        document.getElementById('login-error').textContent = err.message;
    }
};

document.getElementById('register-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    try {
        const data = await apiCall('/auth/send-otp', 'POST', { name, email });
        console.log("📤 Sending OTP via EmailJS Bypass...");
        await emailjs.send("service_qyvuqcs", "template_ht3fkqo", {
            to_email: email, 
            email: email,    
            otp: data.otp,
        });
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

document.getElementById('btn-ask-ai').onclick = async () => {
    const text = document.getElementById('comp-description').value;
    if (!text) return alert("Describe the issue first");
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
        alert("Complaint submitted!");
        showPage('my-complaints-page');
        loadMyComplaints();
    } catch (err) {
        alert(err.message);
    }
};

async function loadMyComplaints() {
    try {
        const complaints = await apiCall('/complaints/my');
        document.getElementById('complaints-list').innerHTML = complaints.map(c => renderComplaint(c)).join('');
    } catch (err) {}
}

async function loadAllComplaints() {
    try {
        const complaints = await apiCall('/complaints/admin');
        document.getElementById('admin-complaints-list').innerHTML = complaints.map(c => renderComplaint(c, true)).join('');
    } catch (err) {}
}

function renderComplaint(c, showUser = false) {
    return `
        <div class="complaint-item">
            <div class="comp-id">ID: ${c.id.substring(0, 8)}</div>
            <div class="comp-title">${c.title}</div>
            <div class="comp-desc">${c.description}</div>
            <div class="ai-box">
                <small>AI Question: ${c.aiQuestion}</small><br>
                <small>Answer: ${c.userAnswer || 'N/A'}</small>
            </div>
        </div>
    `;
}

// Navigation Events
document.getElementById('go-to-register').onclick = () => showPage('register-page');
document.getElementById('go-to-login').onclick = () => showPage('login-page');
document.getElementById('btn-new-complaint').onclick = () => showPage('submit-complaint-page');

// Init
(async () => {
    await checkSession();
    updateNav();
    if (!currentUser) showPage('login-page');
    else if (currentUser.role === 'admin') { showPage('admin-page'); loadAllComplaints(); }
    else { showPage('my-complaints-page'); loadMyComplaints(); }
})();
