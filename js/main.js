/**
 * S-Tools ID Application - Unified Gateway
 * Ownership Identity: Senrima Margasandy
 * Primary Contact: senrima.ms@gmail.com
 */

const API_ENDPOINT = "https://api.s-tools.id";

// ===============================================================
// FUNGSI GLOBAL PEMBANTU: CEK & EKSEKUSI REDIRECT URL (ANTI-OPEN REDIRECT)
// ===============================================================
function eksekusiPengalihanSukses() {
    const parameterUrl = new URLSearchParams(window.location.search);
    const tautanRedirect = parameterUrl.get('redirect');
    
    if (tautanRedirect) {
        try {
            // Mengubah kode enkripsi URL (?redirect=https%3A%2F%2F...) kembali menjadi teks asli
            const decodedUrl = decodeURIComponent(tautanRedirect);
            
            // VALIDASI KEAMANAN KETAT: Izinkan pengalihan jika merupakan internal path (/) atau menuju subdomain s-tools.id
            if (decodedUrl.startsWith('/') || decodedUrl.includes('s-tools.id')) {
                window.location.href = decodedUrl;
                return;
            } else {
                console.warn("Proteksi Keamanan: Percobaan pengalihan ke luar domain s-tools.id diblokir.");
            }
        } catch (e) {
            console.error("Gagal memproses parsing parameter URL redirect:", e);
        }
    }
    
    // Alur Default: Jika tidak ada parameter redirect atau domain dicurigai berbahaya, arahkan ke dashboard utama
    window.location.href = 'dashboard-new.html';
}

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
            
            // Menggunakan pengalihan pintar berbasis redirect URL
            eksekusiPengalihanSukses();
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
// 2. KONTROLER CENTRAL GLOBAL APLIKASI (ALPINE.JS)
// ===============================================================
function app() {
    return {
        view: 'login', // Mengatur tampilan panel ('login' atau 'otp')
        isLoading: false,
        toasts: [],
        profileData: {},
        
        // State Form Struktural Asli
        loginData: { email: '', password: '' },
        registerData: { nama: '', email: '', password: '' }, 
        otp: '',
        status: { message: '', success: false },
        darkMode: false,

        async init() {
            // Cek jika ada token sesi aktif lokal, langsung alihkan tanpa tunggu loading form
            const token = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
            if (token) {
                this.isLoading = true;
                eksekusiPengalihanSukses();
                return;
            }

            // Memeriksa apakah ada interupsi session email temporer untuk alur pemrosesan kode OTP
            const tempEmail = sessionStorage.getItem('tempEmail');
            if (tempEmail) {
                this.loginData.email = tempEmail;
                this.registerData.email = tempEmail;
                this.view = 'otp';
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
                    eksekusiPengalihanSukses();
                    return;
                }
            } catch (e) {
                console.log('Sesi kosong. Form siap digunakan.');
            } finally {
                this.isLoading = false; 
            }
        },

        // MANAJEMEN TOAST NOTIFIKASI INTERNAL
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

        // ALUR LOGIN MANUAL UTAMA
        async login() {
            if (!this.loginData.email || !this.loginData.password) {
                this.status = { message: 'Email dan Password wajib diisi.', success: false };
                this.addToast(this.status.message, 'error');
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
                        action: 'requestOTP', // Menuju endpoint Login GAS asli Anda
                        email: this.loginData.email,
                        password: this.loginData.password
                    })
                });

                const result = await response.json();

                if (result.status === 'success' || result.status === 'sukses') {
                    if (result.step === 'otp') {
                        sessionStorage.setItem('tempEmail', this.loginData.email);
                        this.view = 'otp';
                        this.status = { message: 'Silakan masukkan kode OTP yang telah dikirim.', success: true };
                    } else {
                        // Jika dalam skenario bypass/langsung mengembalikan token tanpa OTP
                        localStorage.setItem('sessionToken', result.token);
                        this.status = { message: 'Login berhasil! Mengalihkan...', success: true };
                        setTimeout(() => { eksekusiPengalihanSukses(); }, 1000);
                    }
                } else {
                    this.status = { message: result.message || 'Login gagal, email atau password salah.', success: false };
                    this.addToast(this.status.message, 'error');
                }
            } catch (error) {
                this.status = { message: 'Terjadi kesalahan saat menghubungi server.', success: false };
                this.addToast(this.status.message, 'error');
            } finally {
                this.isLoading = false;
            }
        },

        // ALUR PENDAFTARAN MANUAL (UNTUK DAFTAR.HTML)
        async register() {
            if (!this.registerData.nama || !this.registerData.email || !this.registerData.password) {
                this.status = { message: 'Semua kolom pendaftaran wajib diisi.', success: false };
                this.addToast(this.status.message, 'error');
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
                        action: 'registerManual', // Menuju endpoint Register GAS asli Anda
                        nama: this.registerData.nama,
                        email: this.registerData.email,
                        password: this.registerData.password
                    })
                });

                const result = await response.json();

                if (result.status === 'success' || result.status === 'sukses') {
                    sessionStorage.setItem('tempEmail', this.registerData.email);
                    this.status = { message: result.message || 'Pendaftaran berhasil! Mengalihkan ke halaman verifikasi...', success: true };
                    
                    if (result.token) {
                        localStorage.setItem('sessionToken', result.token);
                    }

                    // Pengalihan cerdas: Jika pendaftaran membutuhkan validasi OTP, arahkan ke view OTP instan
                    setTimeout(() => {
                        // Jika file pendaftaran Anda menggunakan halaman terpisah otp.html, jalankan pengalihan fisik:
                        window.location.href = 'otp.html';
                    }, 1500);
                } else {
                    this.status = { message: result.message || 'Pendaftaran akun baru gagal.', success: false };
                    this.addToast(this.status.message, 'error');
                }
            } catch (error) {
                this.status = { message: 'Terjadi kesalahan jaringan saat menghubungi server pendaftaran.', success: false };
                this.addToast(this.status.message, 'error');
            } finally {
                this.isLoading = false;
            }
        },

        // ALUR VERIFIKASI KODE OTP
        async verifyOTP() {
            const tempEmail = sessionStorage.getItem('tempEmail') || this.loginData.email || this.registerData.email;
            if (!tempEmail) {
                this.status = { message: 'Sesi hilang. Silakan ulangi proses pendaftaran atau login.', success: false };
                this.view = 'login';
                return;
            }

            if (this.otp.length < 6) {
                this.status = { message: 'Masukkan 6 digit kode OTP secara lengkap.', success: false };
                return;
            }

            this.isLoading = true;
            this.status = { message: 'Memverifikasi kode...', success: true };

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
                    localStorage.setItem('sessionToken', result.token);
                    sessionStorage.removeItem('tempEmail'); // Bersihkan email sementara
                    
                    this.status = { message: 'Verifikasi berhasil! Mengalihkan...', success: true };
                    
                    setTimeout(() => {
                        eksekusiPengalihanSukses();
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

// ===============================================================
// 3. KONTROLER BACKUP SUBSIDIER KHUSUS HALAMAN SEPARASI (OTP.HTML)
// ===============================================================
function otpApp() {
    return {
        otp: '',
        isLoading: false,
        status: { message: '', success: false },
        
        init() {
            const tempEmail = sessionStorage.getItem('tempEmail');
            if (!tempEmail) {
                this.status = { message: 'Sesi tindakan hilang. Silakan ulangi kembali.', success: false };
                setTimeout(() => { window.location.href = 'index.html'; }, 2500);
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
                this.status = { message: 'Sesi hilang. Silakan ulangi tindakan dari beranda.', success: false };
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
                    localStorage.setItem('sessionToken', result.token);
                    sessionStorage.removeItem('tempEmail');
                    this.status = { message: 'Verifikasi berhasil! Mengalihkan...', success: true };
                    
                    setTimeout(() => {
                        eksekusiPengalihanSukses();
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
