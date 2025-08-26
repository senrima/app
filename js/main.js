const API_ENDPOINT = "https://api.senrima.web.id";
const GOOGLE_CLIENT_ID = '140122260876-rea6sfsmcd32acgie6ko7hrr2rj65q6v.apps.googleusercontent.com'; // ❗ Ganti dengan Client ID Anda

// ===============================================================
// == BAGIAN 1: FUNGSI LOGIN & DAFTAR MANUAL (TIDAK BERUBAH)
// ===============================================================

// Otak untuk halaman index.html (Login & Profil)
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
                    window.location.href = 'otp.html';
                } else if (result.status === 'google_login_required') {
                    // Tampilkan pesan error khusus dari server
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

// Otak untuk halaman daftar.html
function registrationApp() {
    return {
        isLoading: false,
        formData: { nama: '', email: '', jawaban: '' },
        captcha: { angka1: 0, angka2: 0, question: '' },
        status: { message: '', success: false },
        isPasswordModalOpen: false, // State untuk modal
        googleUserData: {},         // Untuk menyimpan data google sementara
        passwordForGoogle: '',      // Untuk password dari modal

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
        
                // ▼▼▼ PERUBAHAN UTAMA ADA DI BLOK INI ▼▼▼
        
                // Jika pendaftaran SUKSES...
                if (this.status.success) {
                    // Tampilkan pesan sukses selama 3 detik, lalu redirect.
                    // Ini memberi waktu bagi pengguna untuk membaca pesan.
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 3000); 
                } 
                // Jika pendaftaran GAGAL...
                else {
                    // Buat captcha baru dan tetap di halaman ini.
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

/**
 * Callback yang dipanggil oleh skrip Google setelah siap.
 */
function initializeGoogleSignIn() {
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback 
    });
    
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            google.accounts.id.prompt();
        });
    }
}

/**
 * Menangani respons setelah pengguna memilih akun Google.
 */
function handleGoogleCallback(response) {
    const googleUser = JSON.parse(atob(response.credential.split('.')[1]));
    const userData = {
        id: googleUser.sub,
        email: googleUser.email,
        nama: googleUser.name
    };
    handleGoogleAuth(userData);
}

/**
 * Fungsi utama yang berkomunikasi dengan GAS untuk otentikasi Google.
 */
async function handleGoogleAuth(userData) {
    // Fungsi ini tidak lagi memerlukan parameter password
    const payload = { ...userData };
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify({ kontrol: 'proteksi', action: 'googleAuth', ...payload })
        });
        const result = await response.json();

        // Hanya menangani 2 kasus: sukses atau gagal
        if (result.status === 'login_success') {
            window.location.href = `dashboard-new.html?token=${result.token}`;
        } else {
            alert(result.message || 'Terjadi kesalahan saat otentikasi Google.');
        }
    } catch (error) {
        alert('Gagal terhubung ke server.');
    }
}
// Otak untuk halaman otp.html
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
                            window.location.href = `dashboard-new.html?token=${token}`;
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

// Otak untuk halaman lupa-password.html
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








