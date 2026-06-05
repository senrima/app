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
            // JALUR SSO A: Jangan langsung kunci jika localStorage kosong.
            // Biarkan sistem langsung memanggil data, karena sesi login bisa jadi
            // tersimpan secara aman di Cookie browser (sso_session) dikelola oleh Worker.
            this.isLoading = true;
            this.loadData();
        },

        /**
         * Fungsi Sentral Komunikasi API Gateway (Cloudflare Worker)
         */
        async callApi(payload) {
            // Ambil token lokal jika ada (Untuk dukungan Pendekatan B / Aplikasi Eksternal)
            const localToken = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
            
            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': localToken || '' 
                    },
                    // KRUSIAL UNTUK SSO JALUR A: Memaksa browser mengirim & menerima Cookie 
                    // lintas-subdomain (.s-tools.id) secara otomatis di latar belakang.
                    credentials: 'include', 
                    body: JSON.stringify({ kontrol: 'proteksi', ...payload })
                });
                
                return await response.json();
            } catch (e) {
                console.error("Koneksi API Error:", e);
                return { status: 'error', message: 'Gagal terhubung ke server API Gateway.' };
            }
        },

        async loadData() {
            this.isLoading = true;
            
            try {
                const response = await this.callApi({ action: 'getDashboardData' });
                
                if (response.status === 'success') {
                    this.userData = response.userData;
                    this.notifPreference = response.userData.notifPreference || 'email';
                    
                    await Promise.all([
                        this.loadAssets(),
                        this.loadBonuses(),
                        this.loadTutorials()
                    ]);
                } else {
                    // Sesi tidak valid, tendang kembali ke halaman login
                    console.warn("Sesi tidak sah. Mengembalikan ke login.");
                    window.location.href = 'index.html';
                }
            } catch (error) {
                console.error("Gagal memuat dashboard:", error);
                window.location.href = 'index.html';
            } finally {
                this.isLoading = false;
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
