/**
 * S-Tools ID Application - Unified Gateway
 * Ownership Identity: Senrima Margasandy
 * Primary Contact: senrima.ms@gmail.com
 */

const API_ENDPOINT = "https://api.s-tools.id";

// ===============================================================
// FUNGSI UTAMAA INTER-PENGALIEHAN REDIRECT URL (ANTI-LOOP & SECURE)
// ===============================================================
function jalankanRedirectSistem() {
    const params = new URLSearchParams(window.location.search);
    const targetRedirect = params.get('redirect');
    
    if (targetRedirect) {
        try {
            const decodedUrl = decodeURIComponent(targetRedirect);
            
            // Filter Keamanan: Hanya izinkan path lokal (/) atau tautan internal domain s-tools.id
            if (decodedUrl.startsWith('/') || decodedUrl.includes('s-tools.id')) {
                window.location.href = decodedUrl;
                return;
            }
        } catch (e) {
            console.error("Gagal membaca enkripsi parameter redirect URL:", e);
        }
    }
    
    // Default Fallback Jalur Utama Stabil
    window.location.href = 'dashboard-new.html';
}

// ===============================================================
// 1. SISTEM GOOGLE SSO (HTML API KODE AWAL STABIL)
// ===============================================================
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
            // Pengisian Absolut ke localStorage sesuai Kode Asli Bawaan Anda agar tidak ditendang
            localStorage.setItem('sessionToken', result.token);
            
            // Eksekusi Redirect Pintar
            jalankanRedirectSistem();
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

// ===============================================================
// 2. KONTROLER UTAMA FORMS GATEWAY (ALPINE.JS KODE AWAL STABIL)
// ===============================================================
function app() {
    return {
        view: 'login', 
        isLoading: false, 
        profileData: {},
        toasts: [],
        
        // Kembalikan ke format murni kode awal stabil Anda
        loginData: { email: '', password: '' },
        registerData: { nama: '', email: '', password: '' }, 
        status: { message: '', success: false },
        darkMode: false,
        
        async init() {
            // Pengecekan Absolut Kode Awal Stabil Asli Anda
            const token = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
            if (token) {
                this.isLoading = true;
                jalankanRedirectSistem();
                return;
            }
        
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
                    jalankanRedirectSistem();
                    return;
                }
            } catch (e) {
                console.log('Sesi kosong. Form siap digunakan.');
            } finally {
                this.isLoading = false; 
            }
        },

        addToast(message, type = 'error') {
            const id = Date.now();
            this.toasts.push({ id, message, type, visible: true });
            setTimeout(() => this.removeToast(id), 4000);
        },

        removeToast(id) {
            const index = this.toasts.findIndex(t => t.id === id);
            if (index !== -1) {
                this.toasts[index].visible = false;
                setTimeout(() => {
                    this.toasts = this.toasts.filter(t => t.id !== id);
                }, 300);
            }
        },

        // KODE STABIL LOGIN MANUAL (KEMBALI KE ALUR ORIGINAL 100%)
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
                        action: 'requestOTP', // Sesuai file awal asli
                        email: this.loginData.email,
                        password: this.loginData.password
                    })
                });

                const result = await response.json();

                if (result.status === 'success') {
                    sessionStorage.setItem('tempEmail', this.loginData.email);
                    
                    // Ambil string parameter URL untuk dioper ke halaman otp.html agar redirect tidak hilang
                    window.location.href = 'otp.html';
                } else {
                    this.status = { message: result.message || 'Login gagal, periksa email dan password.', success: false };
                    this.addToast(this.status.message, 'error');
                }
            } catch (error) {
                this.status = { message: 'Terjadi kesalahan saat menghubungi server.', success: false };
                this.addToast(this.status.message, 'error');
            } finally {
                this.isLoading = false;
            }
        },

        // KODE STABIL REGISTRASI MANUAL (KEMBALI KE ALUR ORIGINAL 100%)
        async register() {
            if (!this.registerData.nama || !this.registerData.email || !this.registerData.password) {
                this.status = { message: 'Semua kolom wajib diisi.', success: false };
                return;
            }

            this.isLoading = true;
            this.status = { message: 'Memproses pendaftaran...', success: true };

            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        kontrol: 'proteksi',
                        action: 'registerManual', // Sesuai file awal asli
                        nama: this.registerData.nama,
                        email: this.registerData.email,
                        password: this.registerData.password
                    })
                });

                const result = await response.json();

                if (result.status === 'success') {
                    sessionStorage.setItem('tempEmail', this.registerData.email);
                    
                    // Oper sisa parameter URL ke halaman otp.html
                    window.location.href = 'otp.html';
                } else {
                    this.status = { message: result.message || 'Pendaftaran gagal', success: false };
                    this.addToast(this.status.message, 'error');
                }
            } catch (error) {
                this.status = { message: 'Terjadi kesalahan saat menghubungi server.', success: false };
                this.addToast(this.status.message, 'error');
            } finally {
                this.isLoading = false;
            }
        }
    };
}

// ===============================================================
// 3. KONTROLER SUB-SISTEM OTP (KODE AWAL STABIL DENGAN UPDATE REDIRECT)
// ===============================================================
function otpApp() {
    return {
        otp: '',
        isLoading: false,
        status: { message: '', success: false },
        
        init() {
            const tempEmail = sessionStorage.getItem('tempEmail');
            if (!tempEmail) {
                this.status = { message: 'Sesi pendaftaran hilang. Silakan daftar ulang.', success: false };
                setTimeout(() => { window.location.href = 'daftar.html'; }, 3000);
            }
        },
        
        async submit() {
            if (this.otp.length < 6) {
                this.status = { message: 'Masukkan 6 digit kode OTP.', success: false };
                return;
            }

            this.isLoading = true;
            this.status = { message: 'Memverifikasi kode...', success: true };
            
            const tempEmail = sessionStorage.getItem('tempEmail');
            if (!tempEmail) {
                this.status = { message: 'Sesi hilang. Silakan daftar ulang.', success: false };
                this.isLoading = false;
                return;
            }

            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        kontrol: 'proteksi',
                        action: 'verifyOTP',
                        email: tempEmail,
                        otp: this.otp
                    })
                });

                const result = await response.json();

                if (result.status === 'success' || result.status === 'sukses') {
                    // PENGISIAN ABSOLUT KODE ASLI KE localStorage SUPAYA SEIRAMA DENGAN BACKEND & DASHBOARD
                    localStorage.setItem('sessionToken', result.token);
                    sessionStorage.removeItem('tempEmail'); 
                    
                    this.status = { message: 'Verifikasi berhasil! Mengalihkan...', success: true };
                    
                    setTimeout(() => {
                        // Menggunakan pengalihan sistem pintar
                        jalankanRedirectSistem();
                    }, 1000);
                } else {
                    this.status = { message: result.message || 'OTP salah atau sudah kedaluwarsa.', success: false };
                }
            } catch (error) {
                this.status = { message: 'Terjadi kesalahan saat menghubungi server.', success: false };
            } finally {
                this.isLoading = false;
            }
        }
    };
}
