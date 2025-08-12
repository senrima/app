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
        notifications: [],
        unreadCount: 0,
        passwordFields: { old: '', new: '' }, 
     //   notificationIntervalId: null,
        isAkunMenuOpen: false, 
        activeSubView: 'profile',
        isAssetMenuOpen: false,
        assetSubView: 'produk',

        riwayatPembelian: [],
        isPembelianLoading: false,
        pembelianSearchQuery: '',
        pembelianCurrentPage: 1,
        pembelianItemsPerPage: 5, // Tampilkan 5 item per halaman
        dashboardSummary: {},

        // --- STATE BARU UNTUK RIWAYAT KOIN ---
        historyKoin: [],
        isKoinLoading: false,
        koinSearchQuery: '',
        koinCurrentPage: 1,
        koinItemsPerPage: 10, // Tampilkan 10 item per halaman
        // --- AKHIR STATE BARU ---
        
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

        get filteredPembelian() {
            if (this.pembelianSearchQuery === '') return this.riwayatPembelian;
            this.pembelianCurrentPage = 1;
            const searchLower = this.pembelianSearchQuery.toLowerCase();
            return this.riwayatPembelian.filter(item => 
                item.NomorInvoice.toLowerCase().includes(searchLower) ||
                item.Status.toLowerCase().includes(searchLower)
            );
        },
        get paginatedPembelian() {
            const start = (this.pembelianCurrentPage - 1) * this.pembelianItemsPerPage;
            const end = start + this.pembelianItemsPerPage;
            return this.filteredPembelian.slice(start, end);
        },
        get totalPembelianPages() {
            return Math.ceil(this.filteredPembelian.length / this.pembelianItemsPerPage);
        },

        async loadRiwayatPembelian() {
            const isFirstLoad = this.riwayatPembelian.length === 0;
        
            // Hanya tampilkan skeleton loader besar saat pertama kali dimuat
            if (isFirstLoad) {
                this.isPembelianLoading = true;
            }
        
            // Selalu panggil API untuk mendapatkan data terbaru
            const response = await this.callApi({ action: 'getRiwayatPembelian' });
            
            // Matikan loader setelah data diterima
            this.isPembelianLoading = false;
        
            if (response.status === 'sukses') {
                this.riwayatPembelian = response.data || [];
            } else {
                // Jika gagal, pastikan tabel dikosongkan agar tidak menampilkan data lama
                this.riwayatPembelian = [];
            }
        },
        // Metode paginasi
        nextPembelianPage() { if (this.pembelianCurrentPage < this.totalPembelianPages) this.pembelianCurrentPage++; },
        prevPembelianPage() { if (this.pembelianCurrentPage > 1) this.pembelianCurrentPage--; },


        get filteredKoin() {
            if (this.koinSearchQuery === '') return this.historyKoin;
            this.koinCurrentPage = 1;
            const searchLower = this.koinSearchQuery.toLowerCase();
            return this.historyKoin.filter(item => 
                item.Deskripsi.toLowerCase().includes(searchLower)
            );
        },
        get paginatedKoin() {
            const start = (this.koinCurrentPage - 1) * this.koinItemsPerPage;
            const end = start + this.koinItemsPerPage;
            return this.filteredKoin.slice(start, end);
        },
        get totalKoinPages() {
            return Math.ceil(this.filteredKoin.length / this.koinItemsPerPage);
        },
        
        // --- FUNGSI BARU UNTUK MEMUAT DATA ---
        async loadHistoryKoin() {
            // Jangan muat ulang jika data sudah ada, gunakan tombol refresh
            if (this.historyKoin.length > 0) return; 
        
            this.isKoinLoading = true;
            const response = await this.callApi({ action: 'getHistoryKoin' });
            if (response.status === 'sukses') {
                this.historyKoin = response.data || [];
            }
            this.isKoinLoading = false;
        },
        
        // Metode paginasi
        nextKoinPage() { if (this.koinCurrentPage < this.totalKoinPages) this.koinCurrentPage++; },
        prevKoinPage() { if (this.koinCurrentPage > 1) this.koinCurrentPage--; },
        
        // --- FUNGSI UTAMA ---

        async requestAdminAccess() {
            this.showNotification('Meminta akses admin...'); // Gunakan modal notifikasi yang sudah ada
            
            const response = await this.callApi({ action: 'requestAdminAccess' });
        
            if (response.status === 'success') {
                // Simpan email admin untuk digunakan di halaman OTP
                sessionStorage.setItem('adminEmailForOTP', this.userData.email);
                
                // Arahkan ke halaman OTP khusus admin
                window.location.href = 'otp-admin.html'; 
            } else {
                this.showNotification(response.message || 'Gagal meminta akses.', true);
            }
        },
        
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
                await this.loadNotifications(); 
                this.isLoading = false;

                // --- TAMBAHAN BARU: MULAI INTERVAL REFRESH ---
             //   this.notificationIntervalId = setInterval(() => {
             //       console.log('Refreshing notifications...'); // Untuk debugging, bisa dihapus nanti
             //       this.refreshNotifications();
             //   }, 60000); // 60000 milidetik = 1 menit
                // --- AKHIR TAMBAHAN ---
                
            } catch (e) {
                this.showNotification('Gagal verifikasi sesi.', true);
                setTimeout(() => window.location.href = 'index.html', 2000);
            }
        },
        
        async getDashboardData() {
            const response = await this.callApi({ action: 'getDashboardData' });
            if (response.status === 'success') {
       //         this.userData = response.userData;
                this.userData = response.userData || {};
                this.dashboardSummary = response.dashboardSummary || {}; 

                
                if (this.userData.status === 'Wajib Ganti Password' && this.activeView !== 'akun') {
                    this.activeView = 'akun';
                }
            } else {
                this.showNotification(response.message, true);
                setTimeout(() => window.location.href = 'index.html', 2000);
            }
        },

        // --- FUNGSI NOTIFIKASI BARU ---

        async loadNotifications() {
          const response = await this.callApi({ action: 'getnotifikasi' });
        
          if (response.status === 'sukses' && response.data) {
            // Kode ini aman, bisa menangani jika server mengirim string atau array
            const notificationsData = (typeof response.data === 'string') 
                ? JSON.parse(response.data) 
                : response.data;
        
            this.notifications = notificationsData || [];
            this.unreadCount = this.notifications.filter(n => n.StatusBaca === 'BELUM').length;
        
          } else {
            this.notifications = [];
            this.unreadCount = 0;
            console.error("Gagal memuat notifikasi atau tidak ada data.");
          }
        },

        async markNotificationsAsRead() {
            if (this.unreadCount === 0) return;
            
            // Update tampilan langsung
            this.unreadCount = 0;
            
            // Kirim request ke server untuk update status di database
            await this.callApi({ action: 'tandainotifikasidibaca' });
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

        async refreshNotifications() {
            // Fungsi ini tidak menyetel isLoading, jadi berjalan di latar belakang
            const response = await this.callApi({ action: 'getnotifikasi' });
        
            if (response.status === 'sukses' && response.data) {
                const notificationsData = (typeof response.data === 'string') 
                    ? JSON.parse(response.data) 
                    : response.data;
                
                // Cek jika ada notifikasi baru untuk memberikan efek visual (opsional)
                if (notificationsData.length > this.notifications.length) {
                    // Anda bisa menambahkan sedikit efek visual di sini jika mau
                    // Misalnya, membuat ikon lonceng sedikit bergetar.
                }
        
                this.notifications = notificationsData || [];
                this.unreadCount = this.notifications.filter(n => n.StatusBaca === 'BELUM').length;
            } 
            // Tidak ada 'else' untuk console.error agar tidak memenuhi log saat berjalan di background
        },

        
        async updateProfile() {
            if (!this.userData.nama.trim()) {
                this.showNotification('Nama tidak boleh kosong.', true);
                return;
            }
        
            this.showNotification('Menyimpan perubahan...');
            const response = await this.callApi({ 
                action: 'updateProfile', 
                payload: { newName: this.userData.nama } 
            });
        
            if (response.status === 'success') {
                this.showNotification('Profil berhasil diperbarui.');
            } else {
                this.showNotification(response.message || 'Gagal memperbarui profil.', true);
            }
        },
        
        async changePassword() {
            const { old: oldPassword, new: newPassword } = this.passwordFields;
        
            if (!oldPassword || !newPassword) {
                this.showNotification('Password lama dan baru wajib diisi.', true);
                return;
            }
            if (newPassword.length < 6) {
                this.showNotification('Password baru minimal harus 6 karakter.', true);
                return;
            }
        
            this.showNotification('Mengubah password...');
            const response = await this.callApi({
                action: 'changePassword',
                payload: { oldPassword, newPassword }
            });
        
            if (response.status === 'success') {
                this.showNotification('Password berhasil diubah.');
                // Kosongkan field setelah berhasil
                this.passwordFields = { old: '', new: '' }; 
                // Muat ulang data dashboard jika status berubah dari 'Wajib Ganti Password'
                if (this.userData.status === 'Wajib Ganti Password') {
                    await this.getDashboardData();
                }
            } else {
                this.showNotification(response.message || 'Gagal mengubah password.', true);
            }
        },

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
            // --- TAMBAHAN BARU: HENTIKAN INTERVAL ---
       //     if (this.notificationIntervalId) {
       //         clearInterval(this.notificationIntervalId);
       //         console.log('Notification interval stopped.');
       //     }
            // --- AKHIR TAMBAHAN ---
            
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















