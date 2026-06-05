const API_ENDPOINT = "https://api.s-tools.id";

function dashboardApp() {
    return {
        // ===============================================================
        // == STATE APLIKASI UTAMA
        // ===============================================================
        isLoading: true,
        isSidebarOpen: false,
        activeView: 'beranda',
        userData: { statusAfiliasi: 'Tidak Aktif' },
        dashboardSummary: {},
        modal: {
            isOpen: false, title: 'Pemberitahuan', message: '',
            isConfirmDialog: false, isError: false,
            confirmText: 'Ya, Lanjutkan', cancelText: 'Batal',
            onConfirm: () => {}
        },
        
        isAssetMenuOpen: false, assetSubView: 'produk',
        isAkunMenuOpen: false, activeSubView: 'profile',
        notifications: [], unreadCount: 0,
        digitalAssets: [], isAssetsLoading: false, digitalAssetsSearchQuery: '',
        bonuses: [], isBonusesLoading: false, bonusesSearchQuery: '',
        passwordFields: { old: '', new: '' },
        
        // VARIABEL TABEL YANG SEMPAT HILANG
        riwayatPembelian: [], isPembelianLoading: false, pembelianSearchQuery: '', pembelianCurrentPage: 1, pembelianItemsPerPage: 5,
        historyKoin: [], isKoinLoading: false, koinSearchQuery: '', koinCurrentPage: 1, koinItemsPerPage: 10,
        aksesProduk: [], isAksesProdukLoading: false, aksesProdukSearchQuery: '', aksesProdukCurrentPage: 1, aksesProdukItemsPerPage: 10,
        bonusPengguna: [], isBonusPenggunaLoading: false, bonusPenggunaSearchQuery: '', bonusPenggunaCurrentPage: 1, bonusPenggunaItemsPerPage: 10,
        klaimKode: '',
        
        // VARIABEL AFILIASI
        affiliateData: { summary: { komisi: 0, penjualan: 0, produk: 0 }, coupons: [], products: [] },
        affiliateProductList: [], isAffiliateProductListLoading: false, affiliateProductSearchQuery: '',
        affiliateProductCurrentPage: 1, affiliateProductItemsPerPage: 10,
        isEditCouponModalOpen: false, isAddCouponModalOpen: false,
        editingCoupon: { IDProduk: null, NamaProduk: '', KodeKupon: '', Status: '' },
        newCoupon: { IDProduk: '', NamaProduk: '', DiskonAfiliasi: 0, KodeKupon: '' },

        formatCurrency(value) {
            return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(value) || 0);
        },

        // ===============================================================
        // == FUNGSI INISIALISASI & API GATEWAY 
        // ===============================================================
        async init() {
            this.isLoading = true;
            try {
                await this.getDashboardData();
            } catch (e) {
                console.error("Gagal inisialisasi:", e);
                window.location.href = 'index.html';
            }
        },

        async callApi(payload) {
            const localToken = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken') || '';
            const headers = { 'Content-Type': 'application/json' };
            if (localToken) headers['x-auth-token'] = localToken;

            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: headers,
                    credentials: 'include', // Kunci Utama SSO
                    body: JSON.stringify({ ...payload, kontrol: 'proteksi' })
                });
                const result = await response.json();

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
                return { status: 'error', message: 'Koneksi ke server gagal.' };
            }
        },

        async getDashboardData() {
            const response = await this.callApi({ action: 'getDashboardData' });
            if (response.status === 'success' || response.status === 'sukses') {
                this.userData = response.userData || {};
                this.dashboardSummary = response.dashboardSummary || {};

                if (this.userData.status === 'Wajib Ganti Password' && this.activeView !== 'akun') {
                    this.activeView = 'akun';
                    this.activeSubView = 'profile';
                }

                await this.loadNotifications();
                this.isLoading = false;
            } else {
                this.showNotification(response.message || 'Sesi tidak sah.', true);
                setTimeout(() => window.location.href = 'index.html', 1500);
            }
        },

        // ===============================================================
        // == MODAL & NOTIFIKASI
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
            this.modal.onConfirm = () => { this.modal.isOpen = false; onConfirmCallback(); };
            this.modal.isOpen = true;
        },
        async loadNotifications() {
            const response = await this.callApi({ action: 'getnotifikasi' });
            if (response.status === 'sukses' && response.data) {
                const data = (typeof response.data === 'string') ? JSON.parse(response.data) : response.data;
                this.notifications = data || [];
                this.unreadCount = this.notifications.filter(n => n.StatusBaca === 'BELUM').length;
            }
        },
        async markNotificationsAsRead() {
            if (this.unreadCount === 0) return;
            this.unreadCount = 0;
            await this.callApi({ action: 'tandainotifikasidibaca' });
        },

        // ===============================================================
        // == PRODUK DIGITAL & BONUS
        // ===============================================================
        get filteredDigitalAssets() {
            if (!this.digitalAssetsSearchQuery.trim()) return this.digitalAssets;
            const search = this.digitalAssetsSearchQuery.toLowerCase();
            return this.digitalAssets.filter(asset => asset.NamaAset.toLowerCase().includes(search));
        },
        get filteredBonuses() {
            if (!this.bonusesSearchQuery.trim()) return this.bonuses;
            const search = this.bonusesSearchQuery.toLowerCase();
            return this.bonuses.filter(bonus => bonus.Judul.toLowerCase().includes(search));
        },
        async loadDigitalAssets(forceRefresh = false) {
            if (this.digitalAssets.length > 0 && !forceRefresh) return;
            this.isAssetsLoading = true;
            const response = await this.callApi({ action: 'getAsetDigital' });
            if (response.status === 'success') this.digitalAssets = response.data || [];
            this.isAssetsLoading = false;
        },
        async loadBonuses(forceRefresh = false) {
            if (this.bonuses.length > 0 && !forceRefresh) return;
            this.isBonusesLoading = true;
            const response = await this.callApi({ action: 'getBonus' });
            if (response.status === 'success') this.bonuses = response.data || [];
            this.isBonusesLoading = false;
        },
        async klaimProduk() {
            if (!this.klaimKode.trim()) {
                this.showNotification('Kode Klaim tidak boleh kosong.', true);
                return;
            }
            this.showNotification('Memproses kode klaim...');
            const response = await this.callApi({ action: 'klaimProduk', payload: { kodeKlaim: this.klaimKode } });
            if (response.status === 'sukses' || response.status === 'success') {
                this.showNotification('Klaim berhasil! Produk sedang ditambahkan.');
                this.klaimKode = '';
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
        // == PENGATURAN AKUN & KEAMANAN
        // ===============================================================
        async updateProfile() {
            if (!this.userData.nama.trim()) return this.showNotification('Nama tidak boleh kosong.', true);
            this.showNotification('Menyimpan perubahan...');
            const response = await this.callApi({ action: 'updateProfile', payload: { newName: this.userData.nama } });
            if (response.status === 'success') this.showNotification('Profil berhasil diperbarui.');
            else this.showNotification(response.message || 'Gagal memperbarui profil.', true);
        },
        async changePassword() {
            const { old: oldPassword, new: newPassword } = this.passwordFields;
            if (!oldPassword || !newPassword) return this.showNotification('Password lama dan baru wajib diisi.', true);
            this.showNotification('Mengubah password...');
            const response = await this.callApi({ action: 'changePassword', payload: { oldPassword, newPassword } });
            if (response.status === 'success') {
                this.showNotification('Password berhasil diubah.');
                this.passwordFields = { old: '', new: '' };
            } else this.showNotification(response.message || 'Gagal mengubah password.', true);
        },
        async startTelegramVerification() {
            this.showNotification('Membuat link aman...');
            const response = await this.callApi({ action: 'generateTelegramToken' });
            if (response.status === 'success' && response.token) {
                window.open(`https://t.me/notif_sboots_bot?start=${response.token}`, '_blank');
                this.showNotification('Silakan lanjutkan verifikasi di Telegram.');
            } else this.showNotification('Gagal membuat link.', true);
        },
        async disconnectTelegram() {
            this.showConfirm('Yakin putuskan hubungan Telegram?', async () => {
                const response = await this.callApi({ action: 'disconnectTelegram' });
                if (response.status === 'success') await this.getDashboardData();
            });
        },

        // ===============================================================
        // == LOGIKA TABEL & PAGINASI (YANG SEBELUMNYA HILANG)
        // ===============================================================
        
        // --- 1. Akses Produk ---
        get filteredAksesProduk() {
            if (!this.aksesProdukSearchQuery.trim()) return this.aksesProduk;
            this.aksesProdukCurrentPage = 1;
            const searchLower = this.aksesProdukSearchQuery.toLowerCase();
            return this.aksesProduk.filter(item => item.IDProduk.toLowerCase().includes(searchLower) || item.Status.toLowerCase().includes(searchLower));
        },
        get paginatedAksesProduk() {
            const start = (this.aksesProdukCurrentPage - 1) * this.aksesProdukItemsPerPage;
            return this.filteredAksesProduk.slice(start, start + this.aksesProdukItemsPerPage);
        },
        get totalAksesProdukPages() { return Math.ceil(this.filteredAksesProduk.length / this.aksesProdukItemsPerPage); },
        nextAksesProdukPage() { if (this.aksesProdukCurrentPage < this.totalAksesProdukPages) this.aksesProdukCurrentPage++; },
        prevAksesProdukPage() { if (this.aksesProdukCurrentPage > 1) this.aksesProdukCurrentPage--; },
        async loadAksesProduk() {
            if (this.aksesProduk.length > 0) return;
            this.isAksesProdukLoading = true;
            const response = await this.callApi({ action: 'getAksesProduk' });
            this.isAksesProdukLoading = false;
            if (response && (response.status === 'success' || response.status === 'sukses')) this.aksesProduk = response.data || [];
        },

        // --- 2. Bonus Pengguna ---
        get filteredBonusPengguna() {
            if (!this.bonusPenggunaSearchQuery.trim()) return this.bonusPengguna;
            this.bonusPenggunaCurrentPage = 1;
            const searchLower = this.bonusPenggunaSearchQuery.toLowerCase();
            return this.bonusPengguna.filter(item => item.IDBonus.toLowerCase().includes(searchLower));
        },
        get paginatedBonusPengguna() {
            const start = (this.bonusPenggunaCurrentPage - 1) * this.bonusPenggunaItemsPerPage;
            return this.filteredBonusPengguna.slice(start, start + this.bonusPenggunaItemsPerPage);
        },
        get totalBonusPenggunaPages() { return Math.ceil(this.filteredBonusPengguna.length / this.bonusPenggunaItemsPerPage); },
        nextBonusPenggunaPage() { if (this.bonusPenggunaCurrentPage < this.totalBonusPenggunaPages) this.bonusPenggunaCurrentPage++; },
        prevBonusPenggunaPage() { if (this.bonusPenggunaCurrentPage > 1) this.bonusPenggunaCurrentPage--; },
        async loadBonusPengguna() {
            if (this.bonusPengguna.length > 0) return;
            this.isBonusPenggunaLoading = true;
            const response = await this.callApi({ action: 'getBonusPengguna' });
            this.isBonusPenggunaLoading = false;
            if (response && (response.status === 'success' || response.status === 'sukses')) this.bonusPengguna = response.data || [];
        },

        // --- 3. Riwayat Pembelian ---
        get filteredPembelian() {
            if (!this.pembelianSearchQuery) return this.riwayatPembelian;
            this.pembelianCurrentPage = 1;
            const searchLower = this.pembelianSearchQuery.toLowerCase();
            return this.riwayatPembelian.filter(item => item.NomorInvoice.toLowerCase().includes(searchLower) || item.Status.toLowerCase().includes(searchLower));
        },
        get paginatedPembelian() {
            const start = (this.pembelianCurrentPage - 1) * this.pembelianItemsPerPage;
            return this.filteredPembelian.slice(start, start + this.pembelianItemsPerPage);
        },
        get totalPembelianPages() { return Math.ceil(this.filteredPembelian.length / this.pembelianItemsPerPage); },
        nextPembelianPage() { if (this.pembelianCurrentPage < this.totalPembelianPages) this.pembelianCurrentPage++; },
        prevPembelianPage() { if (this.pembelianCurrentPage > 1) this.pembelianCurrentPage--; },
        async loadRiwayatPembelian() {
            if (this.riwayatPembelian.length === 0) this.isPembelianLoading = true;
            const response = await this.callApi({ action: 'getRiwayatPembelian' });
            this.isPembelianLoading = false;
            if (response.status === 'sukses') this.riwayatPembelian = response.data || [];
        },

        // --- 4. Riwayat Koin ---
        get filteredKoin() {
            if (!this.koinSearchQuery.trim()) return this.historyKoin;
            this.koinCurrentPage = 1;
            const searchLower = this.koinSearchQuery.toLowerCase();
            return this.historyKoin.filter(item => item.Deskripsi.toLowerCase().includes(searchLower));
        },
        get paginatedKoin() {
            const start = (this.koinCurrentPage - 1) * this.koinItemsPerPage;
            return this.filteredKoin.slice(start, start + this.koinItemsPerPage);
        },
        get totalKoinPages() { return Math.ceil(this.filteredKoin.length / this.koinItemsPerPage); },
        nextKoinPage() { if (this.koinCurrentPage < this.totalKoinPages) this.koinCurrentPage++; },
        prevKoinPage() { if (this.koinCurrentPage > 1) this.koinCurrentPage--; },
        async loadHistoryKoin() {
            if (this.historyKoin.length > 0) return;
            this.isKoinLoading = true;
            const response = await this.callApi({ action: 'getHistoryKoin' });
            if (response.status === 'sukses') this.historyKoin = response.data || [];
            this.isKoinLoading = false;
        },

        // ===============================================================
        // == PANEL AFILIASI
        // ===============================================================
        async loadAffiliatePanel() {
            const response = await this.callApi({ action: 'getAffiliatePanelData' });
            if (response.status === 'sukses') this.affiliateData.summary = response.data.summary;
        },
        get filteredAffiliateProductList() {
            if (!this.affiliateProductSearchQuery) return this.affiliateProductList;
            this.affiliateProductCurrentPage = 1;
            const searchQuery = this.affiliateProductSearchQuery.toLowerCase();
            return this.affiliateProductList.filter(product => {
                return product.NamaProduk.toLowerCase().includes(searchQuery) || (product.KodeKupon || '').toLowerCase().includes(searchQuery);
            });
        },
        get paginatedAffiliateProductList() {
            const start = (this.affiliateProductCurrentPage - 1) * this.affiliateProductItemsPerPage;
            return this.filteredAffiliateProductList.slice(start, start + this.affiliateProductItemsPerPage);
        },
        get totalAffiliateProductPages() { return Math.ceil(this.filteredAffiliateProductList.length / this.affiliateProductItemsPerPage); },
        nextAffiliateProductPage() { if (this.affiliateProductCurrentPage < this.totalAffiliateProductPages) this.affiliateProductCurrentPage++; },
        prevAffiliateProductPage() { if (this.affiliateProductCurrentPage > 1) this.affiliateProductCurrentPage--; },
        async loadAffiliateProductList() {
            this.isAffiliateProductListLoading = true;
            const response = await this.callApi({ action: 'getAffiliateProductsAndCoupons' });
            if (response.status === 'sukses') this.affiliateProductList = response.data;
            this.isAffiliateProductListLoading = false;
        },
        openAddCouponModal(product) {
            this.newCoupon = { IDProduk: product.IDProduk, NamaProduk: product.NamaProduk, DiskonAfiliasi: product.DiskonAfiliasi, KodeKupon: '' };
            this.isAddCouponModalOpen = true;
        },
        async createAffiliateCoupon() {
            if (!this.newCoupon.KodeKupon.trim()) return this.showNotification('Kode kupon wajib diisi.', true);
            this.showNotification('Membuat kupon...');
            const response = await this.callApi({ action: 'createAffiliateCoupon', payload: { IDProduk: this.newCoupon.IDProduk, KodeKupon: this.newCoupon.KodeKupon } });
            if (response.status === 'sukses') {
                this.isAddCouponModalOpen = false;
                this.loadAffiliateProductList();
                this.showNotification(response.message);
            } else this.showNotification(response.message || 'Gagal membuat kupon.', true);
        },
        openEditCouponModal(product) {
            this.editingCoupon = { IDProduk: product.IDProduk, NamaProduk: product.NamaProduk, KodeKupon: product.KodeKupon, Status: product.Status };
            this.isEditCouponModalOpen = true;
        },
        async saveCouponStatus() {
            this.showNotification('Menyimpan perubahan...');
            const response = await this.callApi({ action: 'updateAffiliateCouponStatus', payload: { IDProduk: this.editingCoupon.IDProduk, Status: this.editingCoupon.Status } });
            if (response.status === 'sukses') {
                this.showNotification('Status berhasil diubah!');
                this.isEditCouponModalOpen = false;
                this.loadAffiliateProductList();
            } else this.showNotification(response.message || 'Gagal menyimpan.', true);
        },

        // ===============================================================
        // == ADMIN & LOGOUT
        // ===============================================================
        async requestAdminAccess() {
            const response = await this.callApi({ action: 'requestAdminAccess' });
            if (response.status === 'success') {
                sessionStorage.setItem('adminEmailForOTP', this.userData.email);
                window.location.href = 'otp-admin.html'; 
            } else this.showNotification(response.message || 'Gagal meminta akses.', true);
        },
        async logout(callServer = true){
            this.showNotification('Keluar dari sistem...');
            if (callServer) await this.callApi({ action: 'logout' });
            localStorage.removeItem('sessionToken');
            sessionStorage.removeItem('sessionToken');
            window.location.href = 'index.html';
        }
    };
}
