const API_ENDPOINT = "https://api.senrima.web.id";

function dashboardApp() {
    return {
        // Objek untuk menampung semua data dan status
        isLoading: true,
        isSidebarOpen: false,
        activeView: 'beranda',
        userData: {},
        digitalAssets: [],
        bonuses: [],
        sessionToken: null,
        isAssetsLoading: false,
        isBonusesLoading: false,
        modal: {
            isOpen: false,
            title: 'Pemberitahuan',
            message: '',
            isConfirmDialog: false,
            isError: false,
            confirmText: 'Ya, Lanjutkan',
            cancelText: 'Batal',
            onConfirm: () => {}
        },

        // --- FUNGSI UTAMA ---

        async init() {
            const urlParams = new URLSearchParams(window.location.search);
            const initialToken = urlParams.get('token');
            if (!initialToken) {
                this.showNotification('Akses tidak sah. Token tidak ditemukan.', true);
                setTimeout(() => window.location.href = 'index.html', 2000);
                return;
            }
            this.sessionToken = initialToken; 
            try {
                await this.getDashboardData();
                this.isLoading = false;
            } catch (e) {
                this.showNotification('Gagal verifikasi sesi.', true);
                setTimeout(() => window.location.href = 'index.html', 2000);
            }
        },
        
        async getDashboardData() {
            const response = await this.callApi({ action: 'getDashboardData' });
            if (response.status === 'success') {
                this.userData = response.userData;
                if (this.userData.status === 'Wajib Ganti Password' && this.activeView !== 'akun') {
                    this.activeView = 'akun';
                }
            } else {
                this.showNotification(response.message, true);
                setTimeout(() => window.location.href = 'index.html', 2000);
            }
        },

        // --- FUNGSI MODAL (PEMBERITAHUAN & KONFIRMASI) ---

        showNotification(message, isError = false) {
            this.modal.title = isError ? 'Terjadi Kesalahan' : 'Pemberitahuan';
            this.modal.message = message;
            this.modal.isConfirmDialog = false;
            this.modal.isError = isError;
            this.modal.isOpen = true;
        },

        showConfirm(message, onConfirmCallback) {
            this.modal.title = 'Konfirmasi Tindakan';
            this.modal.message = message;
            this.modal.isConfirmDialog = true;
            this.modal.isError = false;
            this.modal.onConfirm = () => {
                this.modal.isOpen = false;
                onConfirmCallback();
            };
            this.modal.isOpen = true;
        },

        // --- FUNGSI PEMUATAN DATA (ASET & BONUS) ---

        async loadDigitalAssets() {
            if (this.digitalAssets.length > 0) return;
            this.isAssetsLoading = true;
            const response = await this.callApi({ action: 'getAsetDigital' });
            if (response.status === 'success') { this.digitalAssets = response.data; } 
            else { this.showNotification('Gagal memuat Aset Digital.', true); }
            this.isAssetsLoading = false;
        },

        async loadBonuses() {
            if (this.bonuses.length > 0) return;
            this.isBonusesLoading = true;
            const response = await this.callApi({ action: 'getBonus' });
            if (response.status === 'success') { this.bonuses = response.data; } 
            else { this.showNotification('Gagal memuat Bonus.', true); }
            this.isBonusesLoading = false;
        },

        // --- FUNGSI AKSI PENGGUNA (TELEGRAM & LOGOUT) ---

        async startTelegramVerification() {
            this.showNotification('Membuat link aman...');
            const response = await this.callApi({ action: 'generateTelegramToken' });
            if (response.status === 'success' && response.token) {
                const telegramLink = `https://t.me/notif_sboots_bot?start=${response.token}`;
                window.open(telegramLink, '_blank');
                this.showNotification('Silakan lanjutkan verifikasi di aplikasi Telegram Anda. Halaman ini akan memuat ulang setelah Anda kembali.');
            } else {
                this.showNotification('Gagal membuat link verifikasi. Coba lagi.', true);
            }
        },

        async disconnectTelegram() {
            this.showConfirm(
                'Anda yakin ingin memutuskan hubungan dengan Telegram? Notifikasi akan kembali dikirim via email.',
                async () => {
                    this.showNotification('Memutuskan hubungan...');
                    const response = await this.callApi({ action: 'disconnectTelegram' });
                    if (response.status === 'success') {
                        this.modal.isOpen = false;
                        await this.getDashboardData();
                    } else {
                        this.showNotification(response.message || 'Gagal memutuskan hubungan.', true);
                    }
                }
            );
        },
        
        async logout(callServer = true) {
            if (callServer) {
                await this.callApi({ action: 'logout' });
            }
            this.sessionToken = null; 
            sessionStorage.clear();
            window.location.href = 'index.html';
        },

        // --- FUNGSI PEMBANTU (API) ---

        async callApi(payload) {
            if (!this.sessionToken) {
                this.showNotification('Sesi tidak valid.', true);
                setTimeout(() => this.logout(false), 2000);
                return { status: 'error', message: 'Sesi tidak valid.' };
            }
            const headers = { 'Content-Type': 'application/json' };
            const body = JSON.stringify({ ...payload, kontrol: 'proteksi', token: this.sessionToken });
            try {
                const response = await fetch(API_ENDPOINT, { method: 'POST', headers, body });
                const result = await response.json();
                if (result.status === 'error' && (result.message.includes('Token tidak valid') || result.message.includes('Sesi telah berakhir'))) {
                    this.showNotification(result.message, true);
                    setTimeout(() => this.logout(false), 2000);
                }
                return result;
            } catch (e) {
                this.showNotification('Koneksi ke server gagal.', true);
                return { status: 'error', message: 'Koneksi ke server gagal.' };
            }
        }
    };
}
