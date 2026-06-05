const API_ENDPOINT = "https://api.s-tools.id";

function dashboardApp() {
    return {
        // ===============================================================
        // == STATE APLIKASI (SEMUA VARIABEL)
        // ===============================================================

        // State Utama
        isLoading: true,
        isSidebarOpen: false,
        activeView: 'beranda',
        userData: {
            nama: '',
            email: '',
            username: '',
            status: '',
            koin: 0,
            statusAfiliasi: 'Tidak Aktif',
            isTelegramConnected: false
        },
        
        // State Modals & Notifikasi Tampilan
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

        // State Menu & Navigasi Submenu
        isAssetMenuOpen: false,
        assetSubView: 'produk',
        isAkunMenuOpen: false,
        activeSubView: 'profile',

        // Data Konten dari Server
        digitalAssets: [],
        isAssetsLoading: false,
        digitalAssetsSearchQuery: '',
        
        bonuses: [],
        isBonusesLoading: false,
        bonusesSearchQuery: '',

        tutorials: [],
        isTutorialsLoading: false,

        // State Pengaturan Akun
        passwordFields: { old: '', new: '' },
        notifPreference: 'email',

        // ===============================================================
        // == FUNGSI INISIALISASI & FUNGSI JALUR UTAMA API
        // ===============================================================

        init() {
            // Hapus pengecekan manual localStorage.
            // Langsung panggil data dan biarkan API Gateway yang memvalidasi Cookie.
            this.isLoading = true;
            try {
                await this.getDashboardData();
            } catch (e) {
                console.error("Gagal inisialisasi:", e);
                window.location.href = 'index.html';
            }
        },

        /**
         * Fungsi Sentral Komunikasi API Gateway (Cloudflare Worker)
         */
        async callApi(payload) {
            // Ambil token lokal sebagai cadangan (jika ada)
            const localToken = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken') || '';
            
            const headers = { 'Content-Type': 'application/json' };
            if (localToken) headers['x-auth-token'] = localToken;

            try {
                const response = await fetch(API_ENDPOINT, { 
                    method: 'POST', 
                    headers: headers, 
                    // SANGAT KRUSIAL: Wajib ada agar Cookie SSO dikirim ke Worker
                    credentials: 'include', 
                    body: JSON.stringify({ ...payload, kontrol: 'proteksi' }) 
                });
                
                const result = await response.json();
                
                // Tangkap respon jika sesi/cookie terbukti mati di server
                if (result.status === 'error' && (result.message.toLowerCase().includes('sesi') || result.message.toLowerCase().includes('token'))) {
                    this.showNotification('Sesi Anda telah berakhir. Mengalihkan ke login...', true);
                    setTimeout(() => {
                        localStorage.removeItem('sessionToken');
                        sessionStorage.removeItem('sessionToken');
                        window.location.href = 'index.html';
                    }, 1500);
                }
                
                return result;
            } catch (e) {
                this.showNotification('Koneksi ke server gagal.', true);
                return { status: 'error', message: 'Koneksi ke server gagal.' };
            }
        },

        async getDashboardData() {
            const response = await this.callApi({ action: 'getDashboardData' });
            
            if (response.status === 'success' || response.status === 'sukses') {
                // Sesi sah! Masukkan data ke antarmuka
                this.userData = response.userData || {};
                this.dashboardSummary = response.dashboardSummary || {}; 
                
                if (this.userData.status === 'Wajib Ganti Password' && this.activeView !== 'akun') {
                    this.activeView = 'akun';
                    this.activeSubView = 'profile';
                }
                
                await this.loadNotifications();
                
                // SUKSES: Matikan animasi loading agar Dashboard tampil!
                this.isLoading = false; 
            } else {
                // Sesi ditolak
                this.showNotification(response.message || 'Sesi tidak sah.', true);
                setTimeout(() => window.location.href = 'index.html', 1500);
            }
        },

        // ===============================================================
        // == MANAJEMEN KONTEN DATA (ASSET, BONUS, TUTORIAL)
        // ===============================================================

        async loadAssets() {
            this.isAssetsLoading = true;
            const res = await this.callApi({ action: 'getAsetDigital' });
            if (res.status === 'success') {
                this.digitalAssets = res.data || [];
            }
            this.isAssetsLoading = false;
        },

        async loadBonuses() {
            this.isBonusesLoading = true;
            const res = await this.callApi({ action: 'getBonus' });
            if (res.status === 'success') {
                this.bonuses = res.data || [];
            }
            this.isBonusesLoading = false;
        },

        async loadTutorials() {
            this.isTutorialsLoading = true;
            const res = await this.callApi({ action: 'getTutorials' });
            if (res.status === 'success') {
                this.tutorials = res.data || [];
            }
            this.isTutorialsLoading = false;
        },

        async watchTutorial(judulVideo) {
            // Kirim update status ke spreadsheet bahwa video sudah ditonton
            const res = await this.callApi({ 
                action: 'updateTutorialStatus', 
                payload: { judul: judulVideo } 
            });
            if (res.status === 'success') {
                // Refresh data lokal tutorial agar UI langsung berubah centang/selesai
                await this.loadTutorials();
            }
        },

        // ===============================================================
        // == FITUR UTALITAS UI & NOTIFIKASI MODAL
        // ===============================================================

        showNotification(message, isError = false, title = 'Pemberitahuan') {
            this.modal.isOpen = true;
            this.modal.title = title;
            this.modal.message = message;
            this.modal.isError = isError;
            this.modal.isConfirmDialog = false;
        },

        // ===============================================================
        // == PROSES KELUAR SISTEM (LOGOUT)
        // ===============================================================

        async logout(callServer = true) {
            this.showNotification('Mengakhiri sesi, mohon tunggu...', false, 'Logout');
            
            if (callServer) {
                // Kirim permintaan hapus sesi ke backend (agar token di spreadsheet dikosongkan)
                await this.callApi({ action: 'logout' });
            }
            
            // Bersihkan data penyimpanan lokal frontend (Pendekatan B)
            sessionStorage.removeItem('sessionToken');
            localStorage.removeItem('sessionToken');
            
            // Alihkan kembali ke login utama. 
            // Worker otomatis menangkap aksi logout ini dan menghapus Cookie sso_session (Max-Age=0)
            setTimeout(() => {
                window.location.href = 'login-new.html';
            }, 1000);
        }
    };
}
