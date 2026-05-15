const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:10000/api'
    : 'https://complaints-registration-platform-full-xnkl.onrender.com/api';

let currentUser = null;

// Navigation
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active')); 
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');
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
            <a href="#" id="nav-login-link">Login</a>
            <a href="#" id="nav-register-link" class="btn btn-primary" style="padding: 0.5rem 1rem; margin-left: 1rem;">Register</a>
        `;
        document.getElementById('nav-login-link').onclick = (e) => {
            e.preventDefault();
            showPage('login-page');
        };
        document.getElementById('nav-register-link').onclick = (e) => {
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
        console.error("🌐 API Call Failed:", err);
        throw new Error(err.message || "Network Error: Could not connect to server");
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

// --- REGISTER FORM (Original ID: otp-form) ---
document.getElementById('otp-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    try {
        const data = await apiCall('/auth/send-otp', 'POST', { name, email });
        
        // --- BYPASS RENDER BLOCK: Send via EmailJS ---
        console.log("🔑 YOUR OTP IS:", data.otp); // COPY THIS FROM THE CONSOLE!
        console.log("📤 Sending OTP via EmailJS Bypass...");
        try {
            await emailjs.send("service_qyvuqcs", "template_ht3fkqo", {
                to_email: email, 
                email: email,    
                user_email: email,
                otp: data.otp,
                OTP: data.otp,
                code: data.otp,
                passcode: data.otp, // MATCHING YOUR IMAGE! 🎯
                message: data.otp,
            });
            console.log("🚀 Email sent successfully via Browser!");
        } catch (emailErr) {
            console.error("❌ EmailJS ERROR:", emailErr);
            throw new Error("Email delivery failed. Try again later.");
        }
        // ----------------------------------------------

        document.getElementById('reg-step-1').classList.add('hidden');
        document.getElementById('reg-step-2').classList.remove('hidden');
    } catch (err) {
        document.getElementById('reg-error').textContent = err.message;
    }
};

// --- VERIFY FORM ---
document.getElementById('verify-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const otp = document.getElementById('reg-otp').value;
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm-password').value; // Original ID

    if (password !== confirm) return alert("Passwords do not match");
    try {
        const data = await apiCall('/auth/register', 'POST', { email, otp, password });
        if (data.token) localStorage.setItem('token', data.token);
        alert("Registration successful! You can now login.");
        showPage('login-page');
    } catch (err) {
        document.getElementById('verify-error').textContent = err.message;
    }
};

// --- COMPLAINT ACTIONS (Original IDs) ---
document.getElementById('btn-get-ai').onclick = async () => {
    const text = document.getElementById('complaint-text').value; // Original ID
    if (!text) return alert("Describe the issue first");
    try {
        // Match the backend property name: complaint_text
        const response = await apiCall('/ai/question', 'POST', { complaint_text: text });
        const question = response.question || response; // Handle both formats
        document.getElementById('ai-question-text').textContent = question;
        document.getElementById('complaint-step-1').classList.add('hidden');
        document.getElementById('complaint-step-2').classList.remove('hidden');
    } catch (err) {
        alert(err.message);
    }
};

document.getElementById('btn-final-submit').onclick = async () => {
    const text = document.getElementById('complaint-text').value;
    const aiQuestion = document.getElementById('ai-question-text').textContent;
    const userAnswer = document.getElementById('ai-answer').value;
    try {
        await apiCall('/complaints', 'POST', { 
            complaint_text: text, 
            ai_question: aiQuestion, 
            ai_answer: userAnswer 
        });
        alert("Complaint submitted successfully!");
        showPage('my-complaints-page');
        loadMyComplaints();
    } catch (err) {
        alert(err.message || "Error saving complaint");
    }
};

async function loadMyComplaints() {
    try {
        const complaints = await apiCall('/complaints/my');
        document.getElementById('my-complaints-list').innerHTML = complaints.map(c => renderComplaint(c)).join('');
    } catch (err) {}
}

async function loadAllComplaints() {
    try {
        const complaints = await apiCall('/admin/complaints');
        document.getElementById('admin-complaints-list').innerHTML = complaints.map(c => `
            <div class="complaint-item" style="background: white; color: #1e293b; border: 1px solid #e2e8f0;">
                <div class="user-info" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; margin-bottom: 1rem; color: #64748b;">
                    <strong>User:</strong> ${c.userName} (${c.userEmail})
                </div>
                <div class="comp-id" style="color: #94a3b8;">ID: ${c.id.substring(0, 8)}</div>
                <div class="comp-desc" style="color: #1e293b; font-weight: 500;">${c.complaintText}</div>
                <div class="ai-section" style="background: #f1f5f9; border-left-color: #6366f1;">
                    <div class="ai-label" style="color: #6366f1;">AI Follow-up Question</div>
                    <div style="font-weight: 600; margin-bottom: 0.5rem; color: #1e293b;">${c.aiQuestion}</div>
                    <div class="ai-label" style="color: #64748b; margin-top: 1rem;">User's Answer</div>
                    <div style="color: #334155;">${c.userAnswer || 'No answer provided'}</div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Admin Load Error:", err);
    }
}

async function loadAllUsers() {
    try {
        const users = await apiCall('/admin/users');
        document.getElementById('admin-users-list').innerHTML = users.map(u => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 1rem; font-weight: 600;">${u.name}</td>
                <td style="padding: 1rem; color: #64748b;">${u.email}</td>
                <td style="padding: 1rem;">
                    <span style="padding: 0.2rem 0.6rem; border-radius: 99px; font-size: 0.75rem; font-weight: 700; background: ${u.role === 'admin' ? '#fee2e2; color: #ef4444;' : '#dcfce7; color: #10b981;'}">
                        ${u.role.toUpperCase()}
                    </span>
                </td>
                <td style="padding: 1rem; color: #94a3b8; font-size: 0.8rem;">${new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("User Load Error:", err);
    }
}

// --- ADMIN PANEL HANDLERS ---
document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.onclick = () => {
        // Update Buttons
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update Content
        const tabId = btn.getAttribute('data-tab');
        document.querySelectorAll('.admin-tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(tabId).classList.remove('hidden');

        // Load data if needed
        if (tabId === 'tab-complaints') loadAllComplaints();
        if (tabId === 'tab-users') loadAllUsers();
    };
});

document.getElementById('admin-add-user-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('admin-user-name').value;
    const email = document.getElementById('admin-user-email').value;
    const password = document.getElementById('admin-user-password').value;
    const role = document.getElementById('admin-user-role').value;

    try {
        await apiCall('/admin/users', 'POST', { name, email, password, role });
        alert("Success: User account created!");
        document.getElementById('admin-add-user-form').reset();
        // Switch to users list
        document.querySelector('[data-tab="tab-users"]').click();
    } catch (err) {
        alert(err.message);
    }
};

// Global Nav Listeners
document.getElementById('go-to-register').onclick = (e) => { e.preventDefault(); showPage('register-page'); };
document.getElementById('go-to-login').onclick = (e) => { e.preventDefault(); showPage('login-page'); };
document.getElementById('btn-new-complaint').onclick = () => showPage('submit-complaint-page');

// Init
(async () => {
    await checkSession();
    updateNav();
    if (!currentUser) showPage('login-page');
    else if (currentUser.role === 'admin') { 
        showPage('admin-page'); 
        loadAllComplaints(); 
    }
    else { 
        showPage('my-complaints-page'); 
        loadMyComplaints(); 
    }
})();
