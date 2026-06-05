/**
 * S-Tools ID Application - Unified Gateway
 * Ownership Identity: Senrima Margasandy
 * Primary Contact: senrima.ms@gmail.com
 */

const API_ENDPOINT = "https://api.s-tools.id";

// ===============================================================
// 1. SISTEM GOOGLE SSO (TERINTEGRASI VIA HTML API)
// ===============================================================

// WAJIB: Jadikan fungsi ini global (window.) agar bisa dipanggil oleh tag HTML Google
window.handleCredentialResponse = async function(response) {
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
            localStorage.setItem('sessionToken', result.token);
            window.location.href = 'dashboard-new.html';
        } else {
            alert(result.message || 'Gagal menyelaraskan akun dengan SSO.');
        }
    } catch (error) {
        console.error("Error SSO:", error);
        alert('Gagal terhubung ke server API Gateway.');
    }
};

function jwt_decode(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Catatan: window.onload dan google.accounts.id.initialize TELAH DIHAPUS.
// Google sekarang otomatis membaca elemen <div id="g_id_onload"> dari HTML.

// ===============================================================
// 2. KONTROLER APLIKASI LOGIN (ALPINE.JS)
// ===============================================================

function app() {
    return {
        view: 'login', 
        isLoading: false, 
        profileData: {},
        loginData: { email: '', password: '' },

        // 1. TAMBAHKAN VARIABEL INI
        registerData: { nama: '', email: '', password: '' },
        
        status: { message: '', success: false },
        
        async init() {
            // Cek Token Lokal
            const token = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
            if (token) {
                this.isLoading = true;
                window.location.href = 'dashboard-new.html';
                return;
            }
        
            // Cek Cookie ke Worker
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
                console.log('Tidak ada sesi. Form login disiapkan.');
            } finally {
                this.isLoading = false; 
            }
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
                        action: 'requestOTP',
                        email: this.loginData.email,
                        password: this.loginData.password
                    })
                });

                const result = await response.json();

                if (result.status === 'success') {
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
        },

        // 2. TAMBAHKAN FUNGSI REGISTER INI
        async register() {
            if (!this.registerData.nama || !this.registerData.email || !this.registerData.password) {
                this.status = { message: 'Semua kolom wajib diisi.', success: false };
                return;
            }

            this.isLoading = true;
            this.status = { message: 'Memproses pendaftaran...', success: true };

            try {
                // Asumsi: Saat user mendaftar manual, GAS akan meminta OTP ke Email
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        kontrol: 'proteksi',
                        action: 'requestOTPRegister', // Sesuaikan jika nama aksinya berbeda di GAS
                        nama: this.registerData.nama,
                        email: this.registerData.email,
                        password: this.registerData.password
                    })
                });

                const result = await response.json();

                if (result.status === 'success') {
                    // Simpan email dan lempar ke halaman OTP
                    sessionStorage.setItem('tempEmail', this.registerData.email);
                    window.location.href = 'otp.html';
                } else {
                    this.status = { message: result.message || 'Pendaftaran gagal', success: false };
                }
            } catch (error) {
                this.status = { message: 'Terjadi kesalahan saat menghubungi server.', success: false };
            } finally {
                this.isLoading = false;
            }
        }
    };
}
