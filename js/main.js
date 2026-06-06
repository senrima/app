/**
 * S-Tools ID Application - Unified Gateway
 * Ownership Identity: Senrima Margasandy
 * Primary Contact: senrima.ms@gmail.com
 */

const API_ENDPOINT = "https://api.s-tools.id";

// ===============================================================
// 1. SISTEM GOOGLE SSO (HTML API)
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

// ===============================================================
// 2. KONTROLER APLIKASI LOGIN & DAFTAR (ALPINE.JS)
// ===============================================================
function app() {
    return {
        view: 'login', 
        isLoading: false, 
        profileData: {},
        
        // State Form Manual
        loginData: { email: '', password: '' },
        registerData: { nama: '', email: '', password: '' }, 
        status: { message: '', success: false },
        
        async init() {
            const token = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
            if (token) {
                this.isLoading = true;
                window.location.href = 'dashboard-new.html';
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
                    window.location.href = 'dashboard-new.html';
                    return;
                }
            } catch (e) {
                console.log('Sesi kosong. Form siap digunakan.');
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
                        action: 'requestOTP', // Menuju fungsi Login GAS
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
            } finally {
                this.isLoading = false;
            }
        },

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
                        action: 'registerManual', // Menuju fungsi Register GAS
                        nama: this.registerData.nama,
                        email: this.registerData.email,
                        password: this.registerData.password
                    })
                });

                const result = await response.json();

                if (result.status === 'success') {
                    sessionStorage.setItem('tempEmail', this.registerData.email);
                    // Arahkan ke halaman OTP karena pendaftaran manual butuh verifikasi email
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

// ===============================================================
// 3. KONTROLER APLIKASI OTP (Khusus untuk otp.html)
// ===============================================================
function otpApp() {
    return {
        otp: '',
        isLoading: false,
        status: { message: '', success: false },
        
        // Pengecekan awal saat halaman OTP dibuka
        init() {
            const tempEmail = sessionStorage.getItem('tempEmail');
            if (!tempEmail) {
                this.status = { message: 'Sesi pendaftaran hilang. Silakan daftar ulang.', success: false };
                // Opsional: Lempar kembali ke halaman pendaftaran setelah 3 detik
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
                    // OTP sukses! Simpan token SSO dan buka Dashboard
                    localStorage.setItem('sessionToken', result.token);
                    sessionStorage.removeItem('tempEmail'); // Bersihkan email sementara
                    
                    this.status = { message: 'Verifikasi berhasil! Mengalihkan...', success: true };
                    
                    // Beri jeda sedikit agar user bisa melihat pesan sukses
                    setTimeout(() => {
                        window.location.href = 'dashboard-new.html';
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
