/**
 * S-Tools ID Application - Unified Gateway
 * Ownership Identity: Senrima Margasandy
 * Primary Contact: senrima.ms@gmail.com
 */

const API_ENDPOINT = "https://api.s-tools.id";
const GOOGLE_CLIENT_ID = '140122260876-rea6sfsmcd32acgie6ko7hrr2rj65q6v.apps.googleusercontent.com';

// ===============================================================
// 1. SISTEM GOOGLE SSO (PENGGANTI SCRIPT.JS)
// ===============================================================

async function handleCredentialResponse(response) {
    try {
        const responsePayload = jwt_decode(response.credential);
        
        const res = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                kontrol: 'proteksi',
                action: 'googleAuth',
                email: responsePayload.email,
                nama: responsePayload.name,
                id: responsePayload.sub
            })
        });

        const result = await res.json();

        if (result.status === 'success' || result.status === 'login_success') {
            // Jika login SSO sukses, set token lokal dan langsung masuk dashboard
            localStorage.setItem('sessionToken', result.token);
            window.location.href = 'dashboard-new.html';
        } else {
            alert(result.message || 'Gagal menyelaraskan akun dengan SSO.');
        }
    } catch (error) {
        console.error("Error SSO:", error);
        alert('Gagal terhubung ke server API Gateway.');
    }
}

function jwt_decode(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('0' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Inisialisasi Google saat halaman dimuat
window.onload = function () {
    if (window.google && google.accounts) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse
        });
        
        const googleBtn = document.getElementById('googleSignInBtn');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => {
                google.accounts.id.prompt();
            });
        }
        
        google.accounts.id.prompt(); 
    }
};

// ===============================================================
// 2. KONTROLER APLIKASI LOGIN (ALPINE.JS)
// ===============================================================

function app() {
    return {
        view: 'login', 
        isLoading: false, 
        profileData: {},
        loginData: { email: '', password: '' },
        status: { message: '', success: false },
        
        async init() {
            // 1. Cek Token Lokal (Fitur Auto-Login yang terbukti jalan)
            const token = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
            if (token) {
                this.isLoading = true;
                window.location.href = 'dashboard-new.html';
                return;
            }
        
            // 2. Cek Cookie SSO Latar Belakang
            try {
                this.isLoading = true;
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ kontrol: 'proteksi', action: 'getDashboardData' })
                });
                const result = await response.json();
                
                if (result.status === 'success') {
                    window.location.href = 'dashboard-new.html';
                    return;
                }
            } catch (e) {
                console.log('Tidak ada sesi cookie. Form login siap digunakan.');
            } 
            
            // 3. JIKA SESI KOSONG: Matikan animasi loading agar UI muncul utuh
            this.isLoading = false; 
        },

        async login() {
            if (!this.loginData.email || !this.loginData.password) {
                this.status = { message: 'Email dan Password wajib diisi.', success: false };
                return;
            }

            this.isLoading = true;
            this.status = { message: 'Memproses login...', success: true };

            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        kontrol: 'proteksi',
                        action: 'requestOTP', // Menuju mekanisme OTP di GAS
                        email: this.loginData.email,
                        password: this.loginData.password
                    })
                });

                const result = await response.json();

                if (result.status === 'success') {
                    // Jika sukses OTP, simpan email dan bawa ke halaman verifikasi OTP
                    sessionStorage.setItem('tempEmail', this.loginData.email);
                    window.location.href = 'otp.html';
                } else {
                    this.status = { message: result.message || 'Login gagal', success: false };
                }
            } catch (error) {
                this.status = { message: 'Terjadi kesalahan saat menghubungi server.', success: false };
                console.error('Login error:', error);
            } finally {
                this.isLoading = false;
            }
        }
    };
}
