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
        sessionToken: null,
        userData: {
        statusAfiliasi: 'Tidak Aktif'
        },
        dashboardSummary: {},
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

        // State Menu & Submenu
        isAssetMenuOpen: false,
        assetSubView: 'produk',
        isAkunMenuOpen: false,
        activeSubView: 'profile',

        // State Notifikasi
        notifications: [],
        unreadCount: 0,

        // State Produk & Bonus Utama
        digitalAssets: [],
        isAssetsLoading: false,
        digitalAssetsSearchQuery: '',
        bonuses: [],
        isBonusesLoading: false,
        bonusesSearchQuery: '',

        // State Halaman Akun
        passwordFields: { old: '', new: '' },

        // State Tabel Riwayat Pembelian
        riwayatPembelian: [],
        isPembelianLoading: false,
        pembelianSearchQuery: '',
        pembelianCurrentPage: 1,
        pembelianItemsPerPage: 5,

        // State Tabel Riwayat Koin
        historyKoin: [],
        isKoinLoading: false,
        koinSearchQuery: '',
        koinCurrentPage: 1,
        koinItemsPerPage: 10,
        
        // State Tabel Detail Akses Produk
        aksesProduk: [],
        isAksesProdukLoading: false,
        aksesProdukSearchQuery: '',
        aksesProdukCurrentPage: 1,
        aksesProdukItemsPerPage: 10,
    
        // State Tabel Detail Bonus Pengguna
        bonusPengguna: [],
        isBonusPenggunaLoading: false,
        bonusPenggunaSearchQuery: '',
        bonusPenggunaCurrentPage: 1,
        bonusPenggunaItemsPerPage: 10,

        // State Klaimkode
        klaimKode: '',
        
        // State untuk data summary panel afiliasi
        affiliateData: {
            summary: {
                komisi: 0,
                penjualan: 0,
                produk: 0
            },
            coupons: [], 
            products: [] 
        },

        // State untuk data, loading, dan pencarian tabel kupon
        affiliateProductList: [],
        isAffiliateProductListLoading: false,
        affiliateProductSearchQuery: '',

        // State untuk paginasi tabel kupon
        affiliateProductCurrentPage: 1,
        affiliateProductItemsPerPage: 10,

        // State untuk mengontrol modal (popup) kupon
        isEditCouponModalOpen: false,
        isAddCouponModalOpen: false,

        // State untuk menampung data di dalam modal "Ubah Kupon"
        editingCoupon: {
            IDProduk: null,
            NamaProduk: '',
            KodeKupon: '',
            Status: ''
        },

        // State untuk menampung data di dalam modal "Buat Kupon Baru"
        newCoupon: {
            IDProduk: '',
            NamaProduk: '',
            DiskonAfiliasi: 0,
            KodeKupon: ''
        },
        
        // ===============================================================
        // == FUNGSI INTI & PEMBANTU
        // ===============================================================
        
        formatCurrency(value) {
            if (typeof value !== 'number') {
                value = Number(value) || 0;
            }
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value);
        },
        
        async init() {
            const initialToken = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
            
            if (!initialToken) {
                this.showNotification('Sesi tidak ditemukan atau telah berakhir. Anda akan diarahkan ke halaman login.', true);
                setTimeout(() => window.location.href = 'index.html', 3000);
                return;
            }
        
            this.sessionToken = initialToken;
            try {
                await this.getDashboardData();
                await this.loadNotifications();
                this.isLoading = false;
                
            } catch (e) {
                this.showNotification('Gagal verifikasi sesi.', true);
                setTimeout(() => window.location.href = 'index.html', 2000);
                sessionStorage.removeItem('sessionToken');
                localStorage.removeItem('sessionToken');
            }
        },

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
        },

        async getDashboardData() {
            const response = await this.callApi({ action: 'getDashboardData' });
            if (response.status === 'success') {
                this.userData = response.userData || {};
                this.dashboardSummary = response.dashboardSummary || {}; 
                if (this.userData.status === 'Wajib Ganti Password' && this.activeView !== 'akun') {
                    this.activeView = 'akun';
                    this.activeSubView = 'profile';
                }
            } else {
                this.showNotification(response.message || 'Gagal memuat data utama.', true);
                setTimeout(() => window.location.href = 'index.html', 2000);
            }
        },

        // ===============================================================
        // == FUNGSI MODAL
        // ===============================================================
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

        // ===============================================================
        // == FUNGSI NOTIFIKASI
        // ===============================================================
        async loadNotifications() {
            const response = await this.callApi({ action: 'getnotifikasi' });
            if (response.status === 'sukses' && response.data) {
                const notificationsData = (typeof response.data === 'string') ? JSON.parse(response.data) : response.data;
                this.notifications = notificationsData || [];
                this.unreadCount = this.notifications.filter(n => n.StatusBaca === 'BELUM').length;
            } else {
                this.notifications = [];
                this.unreadCount = 0;
            }
        },
        async refreshNotifications() {
            const response = await this.callApi({ action: 'getnotifikasi' });
            if (response.status === 'sukses' && response.data) {
                const notificationsData = (typeof response.data === 'string') ? JSON.parse(response.data) : response.data;
                this.notifications = notificationsData || [];
                this.unreadCount = this.notifications.filter(n => n.StatusBaca === 'BELUM').length;
            }
        },
        async markNotificationsAsRead() {
            if (this.unreadCount === 0) return;
            this.unreadCount = 0;
            await this.callApi({ action: 'tandainotifikasidibaca' });
        },


        // ===============================================================
        // == FUNGSI AFILIASI (PANEL & TABEL)
        // ===============================================================
        async loadAffiliatePanel() {
            const response = await this.callApi({ action: 'getAffiliatePanelData' });
            if (response.status === 'sukses') {
                this.affiliateData.summary = response.data.summary;
            } else {
                this.showNotification(response.message || 'Gagal memuat data panel.', true);
            }
        },

        get filteredAffiliateProductList() {
            if (!this.affiliateProductSearchQuery) return this.affiliateProductList;
            this.affiliateProductCurrentPage = 1;
            const searchQuery = this.affiliateProductSearchQuery.toLowerCase();
            return this.affiliateProductList.filter(product => {
                const namaProduk = product.NamaProduk.toLowerCase();
                const kodeKupon = (product.KodeKupon || '').toLowerCase();
                return namaProduk.includes(searchQuery) || kodeKupon.includes(searchQuery);
            });
        },

        get paginatedAffiliateProductList() {
            const start = (this.affiliateProductCurrentPage - 1) * this.affiliateProductItemsPerPage;
            const end = start + this.affiliateProductItemsPerPage;
            return this.filteredAffiliateProductList.slice(start, end);
        },

        get totalAffiliateProductPages() {
            return Math.ceil(this.filteredAffiliateProductList.length / this.affiliateProductItemsPerPage);
        },

        async loadAffiliateProductList() {
            this.isAffiliateProductListLoading = true;
            const response = await this.callApi({ action: 'getAffiliateProductsAndCoupons' });
            if (response.status === 'sukses') {
                this.affiliateProductList = response.data;
            }
            this.isAffiliateProductListLoading = false;
        },

        openAddCouponModal(product) {
            this.newCoupon = {
                IDProduk: product.IDProduk,
                NamaProduk: product.NamaProduk,
                DiskonAfiliasi: product.DiskonAfiliasi,
                KodeKupon: ''
            };
            this.isAddCouponModalOpen = true;
        },

        async createAffiliateCoupon() {
            if (!this.newCoupon.KodeKupon.trim()) {
                this.showNotification('Kode kupon wajib diisi.', true);
                return;
            }
            this.showNotification('Membuat kupon...');
            const response = await this.callApi({
                action: 'createAffiliateCoupon',
                payload: {
                    IDProduk: this.newCoupon.IDProduk,
                    KodeKupon: this.newCoupon.KodeKupon
                }
            });

            if (response.status === 'sukses') {
                this.isAddCouponModalOpen = false;
                this.loadAffiliateProductList();
                this.showNotification(response.message);
            } else {
                this.showNotification(response.message || 'Gagal membuat kupon.', true);
            }
        },

        openEditCouponModal(product) {
            this.editingCoupon = {
                IDProduk: product.IDProduk,
                NamaProduk: product.NamaProduk,
                KodeKupon: product.KodeKupon,
                Status: product.Status
            };
            this.isEditCouponModalOpen = true;
        },

        async saveCouponStatus() {
            this.showNotification('Menyimpan perubahan...');
            const response = await this.callApi({
                action: 'updateAffiliateCouponStatus',
                payload: {
                    IDProduk: this.editingCoupon.IDProduk,
                    Status: this.editingCoupon.Status
                }
            });
            if (response.status === 'sukses') {
                this.showNotification('Status berhasil diubah!');
                this.isEditCouponModalOpen = false;
                this.loadAffiliateProductList();
            } else {
                this.showNotification(response.message || 'Gagal menyimpan.', true);
            }
        },

        nextAffiliateProductPage() {
            if (this.affiliateProductCurrentPage < this.totalAffiliateProductPages) {
                this.affiliateProductCurrentPage++;
            }
        },

        prevAffiliateProductPage() {
            if (this.affiliateProductCurrentPage > 1) {
                this.affiliateProductCurrentPage--;
            }
        },
        
        // ===============================================================
        // == KLAIM
        // ===============================================================

        async klaimProduk() {
            if (!this.klaimKode.trim()) {
                this.showNotification('Kode Klaim tidak boleh kosong.', true);
                return;
            }
            this.showNotification('Memproses kode klaim...');
            
            const response = await this.callApi({
                action: 'klaimProduk',
                payload: { kodeKlaim: this.klaimKode }
            });
    
            if (response.status === 'sukses' || response.status === 'success') {
                this.showNotification('Klaim berhasil! Produk sedang ditambahkan ke akun Anda.');
                this.klaimKode = ''; // Kosongkan input
                // Refresh daftar produk setelah beberapa saat
                setTimeout(() => {
                    this.digitalAssets = [];
                    this.loadDigitalAssets();
                    this.activeView = 'aset';
                    this.assetSubView = 'produk';
                }, 2000);
            } else {
                this.showNotification(response.message || 'Gagal melakukan klaim.', true);
            }
        },

        // ===============================================================
        // == FUNGSI MENU UTAMA (PRODUK & BONUS)
        // ===============================================================
        async loadDigitalAssets() {
            if (this.digitalAssets.length > 0 && !forceRefresh) return;
            this.isAssetsLoading = true;
            const response = await this.callApi({ action: 'getAsetDigital' });
            if (response.status === 'success') {
                this.digitalAssets = response.data || [];
            }
            this.isAssetsLoading = false;
        },
        async loadBonuses() {
            if (this.bonuses.length > 0 && !forceRefresh) return;
            this.isBonusesLoading = true;
            const response = await this.callApi({ action: 'getBonus' });
            if (response.status === 'success') {
                this.bonuses = response.data || [];
            }
            this.isBonusesLoading = false;
        },

        get filteredDigitalAssets() {
            if (!this.digitalAssetsSearchQuery.trim()) return this.digitalAssets;
            const search = this.digitalAssetsSearchQuery.toLowerCase();
            return this.digitalAssets.filter(asset => 
                asset.NamaAset.toLowerCase().includes(search)
            );
        },
        
        get filteredBonuses() {
            if (!this.bonusesSearchQuery.trim()) return this.bonuses;
            const search = this.bonusesSearchQuery.toLowerCase();
            return this.bonuses.filter(bonus => 
                bonus.Judul.toLowerCase().includes(search)
            );
        },

        // ===============================================================
        // == FUNGSI HALAMAN AKUN SAYA
        // ===============================================================
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
                this.passwordFields = { old: '', new: '' }; 
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
                this.showNotification('Silakan lanjutkan verifikasi di aplikasi Telegram Anda.');
            } else {
                this.showNotification('Gagal membuat link verifikasi. Coba lagi.', true);
            }
        },
        async disconnectTelegram() {
            this.showConfirm(
                'Anda yakin ingin memutuskan hubungan dengan Telegram?',
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

        // ===============================================================
        // == LOGIKA TABEL DETAIL AKSES PRODUK
        // ===============================================================
        get filteredAksesProduk() {
            if (!this.aksesProdukSearchQuery.trim()) return this.aksesProduk;
            this.aksesProdukCurrentPage = 1;
            const searchLower = this.aksesProdukSearchQuery.toLowerCase();
            return this.aksesProduk.filter(item => 
                item.IDProduk.toLowerCase().includes(searchLower) ||
                item.Status.toLowerCase().includes(searchLower)
            );
        },
        get paginatedAksesProduk() {
            const start = (this.aksesProdukCurrentPage - 1) * this.aksesProdukItemsPerPage;
            return this.filteredAksesProduk.slice(start, start + this.aksesProdukItemsPerPage);
        },
        get totalAksesProdukPages() {
            return Math.ceil(this.filteredAksesProduk.length / this.aksesProdukItemsPerPage);
        },
        nextAksesProdukPage() { if (this.aksesProdukCurrentPage < this.totalAksesProdukPages) this.aksesProdukCurrentPage++; },
        prevAksesProdukPage() { if (this.aksesProdukCurrentPage > 1) this.aksesProdukCurrentPage--; },
        async loadAksesProduk() {
            if (this.isAksesProdukLoading.length > 0) return; 
            this.isAksesProdukLoading = true;
            const response = await this.callApi({ action: 'getAksesProduk' });
            this.isAksesProdukLoading = false;
            if (response && (response.status === 'success' || response.status === 'sukses')) {
                this.aksesProduk = response.data || [];
            } else {
                this.aksesProduk = [];
            }
        },
        
        // ===============================================================
        // == LOGIKA TABEL DETAIL BONUS PENGGUNA
        // ===============================================================
        get filteredBonusPengguna() {
            if (!this.bonusPenggunaSearchQuery.trim()) return this.bonusPengguna;
            this.bonusPenggunaCurrentPage = 1;
            const searchLower = this.bonusPenggunaSearchQuery.toLowerCase();
            return this.bonusPengguna.filter(item => 
                item.IDBonus.toLowerCase().includes(searchLower)
            );
        },
        get paginatedBonusPengguna() {
            const start = (this.bonusPenggunaCurrentPage - 1) * this.bonusPenggunaItemsPerPage;
            return this.filteredBonusPengguna.slice(start, start + this.bonusPenggunaItemsPerPage);
        },
        get totalBonusPenggunaPages() {
            return Math.ceil(this.filteredBonusPengguna.length / this.bonusPenggunaItemsPerPage);
        },
        nextBonusPenggunaPage() { if (this.bonusPenggunaCurrentPage < this.totalBonusPenggunaPages) this.bonusPenggunaCurrentPage++; },
        prevBonusPenggunaPage() { if (this.bonusPenggunaCurrentPage > 1) this.bonusPenggunaCurrentPage--; },
        async loadBonusPengguna() {
            if (this.isBonusPenggunaLoading.length > 0) return; 
            this.isBonusPenggunaLoading = true;
            const response = await this.callApi({ action: 'getBonusPengguna' });
            this.isBonusPenggunaLoading = false;
            if (response && (response.status === 'success' || response.status === 'sukses')) {
                this.bonusPengguna = response.data || [];
            } else {
                this.bonusPengguna = [];
            }
        },

        // ===============================================================
        // == LOGIKA TABEL RIWAYAT PEMBELIAN
        // ===============================================================
        get filteredPembelian() {
            if (!this.pembelianSearchQuery) return this.riwayatPembelian;
            this.pembelianCurrentPage = 1;
            const searchLower = this.pembelianSearchQuery.toLowerCase();
            return this.riwayatPembelian.filter(item => 
                item.NomorInvoice.toLowerCase().includes(searchLower) ||
                item.Status.toLowerCase().includes(searchLower)
            );
        },
        get paginatedPembelian() {
            const start = (this.pembelianCurrentPage - 1) * this.pembelianItemsPerPage;
            return this.filteredPembelian.slice(start, start + this.pembelianItemsPerPage);
        },
        get totalPembelianPages() {
            return Math.ceil(this.filteredPembelian.length / this.pembelianItemsPerPage);
        },
        async loadRiwayatPembelian() {
            const isFirstLoad = this.riwayatPembelian.length === 0;
            if (isFirstLoad) {
                this.isPembelianLoading = true;
            }
            const response = await this.callApi({ action: 'getRiwayatPembelian' });
            this.isPembelianLoading = false;
            if (response.status === 'sukses') {
                this.riwayatPembelian = response.data || [];
            } else {
                this.riwayatPembelian = [];
            }
        },
        nextPembelianPage() { if (this.pembelianCurrentPage < this.totalPembelianPages) this.pembelianCurrentPage++; },
        prevPembelianPage() { if (this.pembelianCurrentPage > 1) this.pembelianCurrentPage--; },

        // ===============================================================
        // == LOGIKA TABEL RIWAYAT KOIN
        // ===============================================================
        get filteredKoin() {
            if (!this.koinSearchQuery.trim()) return this.historyKoin;
            this.koinCurrentPage = 1;
            const searchLower = this.koinSearchQuery.toLowerCase();
            return this.historyKoin.filter(item => 
                item.Deskripsi.toLowerCase().includes(searchLower)
            );
        },
        get paginatedKoin() {
            const start = (this.koinCurrentPage - 1) * this.koinItemsPerPage;
            return this.filteredKoin.slice(start, start + this.koinItemsPerPage);
        },
        get totalKoinPages() {
            return Math.ceil(this.filteredKoin.length / this.koinItemsPerPage);
        },
        async loadHistoryKoin() {
            if (this.historyKoin.length > 0) return;
            this.isKoinLoading = true;
            const response = await this.callApi({ action: 'getHistoryKoin' });
            if (response.status === 'sukses') {
                this.historyKoin = response.data || [];
            }
            this.isKoinLoading = false;
        },
        nextKoinPage() { if (this.koinCurrentPage < this.totalKoinPages) this.koinCurrentPage++; },
        prevKoinPage() { if (this.koinCurrentPage > 1) this.koinCurrentPage--; },
        
        // ===============================================================
        // == FUNGSI AKSES ADMIN & LOGOUT
        // ===============================================================
        async requestAdminAccess() {
            this.showNotification('Meminta akses admin...');
            const response = await this.callApi({ action: 'requestAdminAccess' });
            if (response.status === 'success') {
                sessionStorage.setItem('adminEmailForOTP', this.userData.email);
                window.location.href = 'otp-admin.html'; 
            } else {
                this.showNotification(response.message || 'Gagal meminta akses.', true);
            }
        },

        async logout(callServer = true) {
            if (callServer) {
                await this.callApi({ action: 'logout' });
            }
            this.sessionToken = null;
            this.isLoading = false;
            sessionStorage.removeItem('sessionToken');
            localStorage.removeItem('sessionToken');
            window.location.href = 'index.html';
        }
    };
}


