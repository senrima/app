const API_ENDPOINT = "https://api.s-tools.id";
const GOOGLE_CLIENT_ID = '140122260876-rea6sfsmcd32acgie6ko7hrr2rj65q6v.apps.googleusercontent.com';
// ===============================================================
// == BAGIAN 1: FUNGSI LOGIN & DAFTAR MANUAL (TIDAK BERUBAH)
// ===============================================================

// Login
function app() {
    return {
        view: 'login', isLoading: false, profileData: {},
        loginData: { email: '', password: '' },
        status: { message: '', success: false },
        init() {
            const hash = window.location.hash.substring(1);
            if (hash && hash.startsWith('/')) {
                const username = hash.substring(1);
                if (username) { this.view = 'profile'; this.loadPublicProfile(username); }
            }
        },
        async loadPublicProfile(username) { /* ... (kode tidak berubah) ... */ },
        async login() {
            this.isLoading = true;
            this.status = { message: '', success: false };
            try {
                sessionStorage.setItem('userEmailForOTP', this.loginData.email);
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kontrol: 'proteksi', action: 'requestOTP', email: this.loginData.email, password: this.loginData.password })
                });
                const result = await response.json();
                this.status.message = result.message;
                this.status.success = result.status === 'success';
                
                if (result.status === 'success') {
                    const remember = document.getElementById('remember-me').checked;
                    sessionStorage.setItem('rememberMeStatus', remember);
                    window.location.href = 'otp.html';
                } else if (result.status === 'google_login_required') {
                    this.status.message = result.message;
                    this.status.success = false;
                }
                
            } catch (e) {
                this.status.message = 'Gagal terhubung ke server.';
                this.status.success = false;
            } finally { this.isLoading = false; }
        }
    };
}

// Daftar
function registrationApp() {
    return {
        isLoading: false,
        formData: { nama: '', email: '', jawaban: '' },
        captcha: { angka1: 0, angka2: 0, question: '' },
        status: { message: '', success: false },
        isPasswordModalOpen: false,
        googleUserData: {},        
        passwordForGoogle: '',  

        init() { this.generateCaptcha(); },
        generateCaptcha() {
            this.captcha.angka1 = Math.floor(Math.random() * 10) + 1;
            this.captcha.angka2 = Math.floor(Math.random() * 10) + 1;
            this.captcha.question = `${this.captcha.angka1} + ${this.captcha.angka2}`;
        },
        async submit() {
            this.isLoading = true;
            this.status = { message: '', success: false };
            try {
                const payload = { ...this.formData, ...this.captcha, kontrol: 'proteksi', action: 'register' };
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
        
                this.status.message = result.message;
                this.status.success = result.status === 'success';
        
                if (this.status.success) {

                setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 3000); 
                } 
                else {
                    this.generateCaptcha();
                }
        
            } catch (e) {
                this.status.message = 'Gagal terhubung ke server.';
                this.status.success = false;
            } finally {
                this.isLoading = false;
            }
        },
    };
}

// ===============================================================
// == BAGIAN 2: LOGIKA BARU UNTUK GOOGLE SIGN-IN (GLOBAL)
// ===============================================================


function initializeGoogleSignIn() {
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback 
    });
    
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {

            googleBtn.disabled = true;
            googleBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V4a10 10 0 00-10 10h2z"></path>
                </svg>
                Memproses...
            `;
            googleBtn.classList.add('opacity-75', 'cursor-not-allowed');
            google.accounts.id.prompt();

        });
    }
}

function handleGoogleCallback(response) {
    const googleUser = JSON.parse(atob(response.credential.split('.')[1]));
    const userData = {
        id: googleUser.sub,
        email: googleUser.email,
        nama: googleUser.name,
        foto: googleUser.picture
    };
    handleGoogleAuth(userData);
}

async function handleGoogleAuth(userData) {
    const payload = { ...userData };
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify({ kontrol: 'proteksi', action: 'googleAuth', ...payload })
        });
        const result = await response.json();
        if (result.status === 'login_success') {
            const remember = document.getElementById('remember-me').checked;
            if (remember) {
                localStorage.setItem('sessionToken', result.token);
            } else {
                sessionStorage.setItem('sessionToken', result.token);
            }
            setTimeout(() => window.location.href = 'dashboard-new.html', 3000);
        } else {
            alert(result.message || 'Terjadi kesalahan saat otentikasi Google.');
        }
    } catch (error) {
        alert('Gagal terhubung ke server.');
    }
}

// ===============================================================
// == BAGIAN 3: LOGIKA LAIN
// ===============================================================

// OTP
function otpApp() {
    return {
        isLoading: false,
        otp: '',
        status: { message: '', success: false },
        submit() {
            this.isLoading = true;
            this.status = { message: '', success: false };
            const email = sessionStorage.getItem('userEmailForOTP');
            if (!email) {
                this.status.message = 'Sesi tidak ditemukan, silakan login ulang.';
                this.status.success = false;
                this.isLoading = false;
                return;
            }
            (async () => {
                try {
                    const response = await fetch(API_ENDPOINT, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ kontrol: 'proteksi', action: 'verifyOTP', email: email, otp: this.otp })
                    });
                    const result = await response.json();
                    this.status.message = result.message;
                    this.status.success = result.status.includes('success');
                    if (result.status.includes('success') || result.status.includes('change_password_required')) {
                        const token = result.token;
                        if (token) {
                            sessionStorage.removeItem('userEmailForOTP');
                            const remember = sessionStorage.getItem('rememberMeStatus') === 'true';
                            sessionStorage.removeItem('rememberMeStatus');
                            if (remember) {
                                localStorage.setItem('sessionToken', token);
                            } else {
                                sessionStorage.setItem('sessionToken', token);
                            }
                            setTimeout(() => window.location.href = 'dashboard-new.html', 3000);

                        } else { this.status = { message: 'Gagal mendapatkan token sesi.', success: false }; }
                    }
                } catch (e) {
                    this.status.message = 'Gagal terhubung ke server.';
                    this.status.success = false;
                } finally { this.isLoading = false; }
            })();
        }
    };
}

// Lupa Password
function forgotPasswordApp() {
    return {
        isLoading: false,
        email: '',
        status: { message: '', success: false },
        async submit() {
            this.isLoading = true;
            this.status = { message: '', success: false };
            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kontrol: 'proteksi', action: 'forgotPassword', email: this.email })
                });
                const result = await response.json();
                this.status.message = result.message;
                this.status.success = result.status === 'success';
            } catch (e) {
                this.status.message = 'Gagal terhubung ke server.';
                this.status.success = false;
            } finally { this.isLoading = false; }
        }
    };
}




