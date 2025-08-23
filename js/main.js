const API_ENDPOINT = "https://api.senrima.web.id";

const GOOGLE_CLIENT_ID = '140122260876-rea6sfsmcd32acgie6ko7hrr2rj65q6v.apps.googleusercontent.com'; // ❗ Ganti dengan Client ID Anda

function googleAuthApp() {
    return {
        // State
        isLoading: false,
        page: '', // 'login' atau 'register'
        googleUserData: null,
        isPasswordModalOpen: false,
        passwordForGoogle: '',

        // Inisialisasi Google Sign-In
        initGoogle() {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: this.handleGoogleCallback.bind(this)
            });
        },

        // Memulai alur login Google
        signInWithGoogle() {
            google.accounts.id.prompt();
        },

        // Callback setelah login Google berhasil
        async handleGoogleCallback(response) {
            this.isLoading = true;
            const googleUser = JSON.parse(atob(response.credential.split('.')[1]));
            this.googleUserData = {
                id: googleUser.sub,
                email: googleUser.email,
                nama: googleUser.name
            };

            // Langsung kirim ke GAS
            const result = await this.callGoogleAuthApi();
            this.handleApiResponse(result);
        },
        
        // Memanggil API GAS
        async callGoogleAuthApi(password = null) {
            const payload = { 
                ...this.googleUserData, 
                password: password 
            };
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                body: JSON.stringify({ kontrol: 'proteksi', action: 'googleAuth', ...payload })
            });
            return await response.json();
        },

        // Menangani respons dari API
        handleApiResponse(result) {
            if (result.status === 'login_success') {
                window.location.href = `dashboard-new.html?token=${result.token}`;
            } else if (result.status === 'registration_required') {
                if (this.page === 'register') {
                    // Jika di halaman daftar, tampilkan modal password
                    this.isPasswordModalOpen = true;
                } else {
                    // Jika di halaman login, arahkan ke daftar
                    alert('Akun tidak ditemukan. Silakan daftar terlebih dahulu.');
                    window.location.href = 'daftar.html';
                }
            } else {
                alert(result.message || 'Terjadi kesalahan.');
            }
            this.isLoading = false;
        },

        // Menyelesaikan registrasi setelah input password
        async completeGoogleRegistration() {
            if (this.passwordForGoogle.length < 6) {
                alert('Password minimal harus 6 karakter.');
                return;
            }
            this.isLoading = true;
            this.isPasswordModalOpen = false;
            const result = await this.callGoogleAuthApi(this.passwordForGoogle);
            this.handleApiResponse(result);
        },

        // Inisialisasi utama saat halaman dimuat
        init() {
            // Tunggu skrip google siap
            const checkGoogle = setInterval(() => {
                if (typeof google !== 'undefined') {
                    clearInterval(checkGoogle);
                    this.initGoogle();
                }
            }, 100);
        }
    };
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

