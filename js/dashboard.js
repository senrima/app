const API_ENDPOINT = "https://api.s-tools.id";

function dashboardApp() {
    return {
        // ===============================================================
        // == STATE APLIKASI
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
        riwayatPembelian: [], isPembelianLoading: false, pembelianSearchQuery: '', pembelianCurrentPage: 1, pembelianItemsPerPage: 5,
        historyKoin: [], isKoinLoading: false, koinSearchQuery: '', koinCurrentPage: 1, koinItemsPerPage: 10,
        aksesProduk: [], isAksesProdukLoading: false, aksesProdukSearchQuery: '', aksesProdukCurrentPage: 1, aksesProdukItemsPerPage: 10,
        bonusPengguna: [], isBonusPenggunaLoading: false, bonusPenggunaSearchQuery: '', bonusPenggunaCurrentPage: 1, bonusPenggunaItemsPerPage: 10,
        klaimKode: '',
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
                    credentials: 'include', // Mengirim Cookie SSO ke Worker
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
                this.loadDigitalAssets();
                this.loadBonuses();
                
                this.isLoading = false; // Matikan layar putih!
            } else {
                this.showNotification(response.message || 'Sesi tidak sah.', true);
                setTimeout(() => window.location.href = 'index.html', 1500);
            }
        },

        // ===============================================================
        // == FUNGSI PENDUKUNG (NOTIF, MODAL, DATA)
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

        // Fitur Pencarian & Filter
        get filteredDigitalAssets() { return this.digitalAssetsSearchQuery ? this.digitalAssets.filter(a => a.NamaAset.toLowerCase().includes(this.digitalAssetsSearchQuery.toLowerCase())) : this.digitalAssets; },
        get filteredBonuses() { return this.bonusesSearchQuery ? this.bonuses.filter(b => b.Judul.toLowerCase().includes(this.bonusesSearchQuery.toLowerCase())) : this.bonuses; },

        // Akun & Keamanan
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

        // Fitur Admin & Logout
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
