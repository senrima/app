const API_ENDPOINT = "https://api.s-tools.id";

function dashboardApp() {
    return {
        // ===============================================================
        // == STATE APLIKASI UTAMA (SEMUA VARIABEL YANG DIBUTUHKAN HTML)
        // ===============================================================
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
        dashboardSummary: {},
        modal: {
            isOpen: false, title: 'Pemberitahuan', message: '',
            isConfirmDialog: false, isError: false,
            confirmText: 'Ya, Lanjutkan', cancelText: 'Batal',
            onConfirm: () => {}
        },

        // Navigasi & Tampilan Submenu
        isAssetMenuOpen: false, assetSubView: 'produk',
        isAkunMenuOpen: false, activeSubView: 'profile',

        // Notifikasi & Pesan Pengumuman Global
        notifications: [],
        unreadCount: 0,

        // Data Tabel Aset Digital & Bonus (Versi Baru)
        tableItems: [],
        isTableLoading: false,

        // Data Lama Produk Digital & Bonus (Untuk Backup Kompatibilitas)
        digitalAssets: [],
        isAssetsLoading: false,
        digitalAssetsSearchQuery: '',
        
        bonuses: [],
        isBonusesLoading: false,
        bonusesSearchQuery: '',

        // Form Ganti Profil & Password
        profileForm: { nama: '' },
        passwordForm: { oldPassword: '', newPassword: '' },
        passwordFields: { old: '', new: '' }, // Cadangan untuk compat b/w

        // Tabel Data Paginasi Dinamis
        riwayatPembelian: [], isPembelianLoading: false, pembelianSearchQuery: '', pembelianCurrentPage: 1, pembelianItemsPerPage: 5,
        historyKoin: [], isKoinLoading: false, koinSearchQuery: '', koinCurrentPage: 1, koinItemsPerPage: 10,
        aksesProduk: [], isAksesProdukLoading: false, aksesProdukSearchQuery: '', aksesProdukCurrentPage: 1, aksesProdukItemsPerPage: 10,
        bonusPengguna: [], isBonusPenggunaLoading: false, bonusPenggunaSearchQuery: '', bonusPenggunaCurrentPage: 1, bonusPenggunaItemsPerPage: 10,
        
        // Pendaftaran & Klaim Kode Voucher
        klaimKode: '',
        voucherCode: '', // Cadangan sinkronisasi dengan claimProduct
        isClaiming: false,
        
        // Data Afiliasi
        affiliateData: { kode: '', status: '', koin: 0, link: '' },
        affiliateProductList: [], isAffiliateProductListLoading: false, affiliateProductSearchQuery: '',
        affiliateProductCurrentPage: 1, affiliateProductItemsPerPage: 10,

        formatCurrency(value) {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
            }).format(Number(value) || 0);
        },
        
        // ===============================================================
        // == FUNGSI INISIALISASI & API GATEWAY SSO
        // ===============================================================
        async init() {
            this.isLoading = true;
            try {
                // Panggil data profil dasar untuk otentikasi awal
                await this.getDashboardData();
                
                // Jika login valid, muat seluruh data pendukung secara paralel
                await Promise.all([
                    this.loadNotifications(),
                    this.loadAffiliateData()
                ]);
            } catch (e) {
                console.error("Gagal inisialisasi sesi:", e);
                window.location.href = 'index.html';
            } finally {
                this.isLoading = false;
            }
        },

        async callApi(payload) {
            const localToken = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken') || '';
            const headers = { 'Content-Type': 'application/json' };
            if (localToken) headers['x-auth-token'] = localToken;

            // Suntik Token Ganda ke Body Payload (Sebagai pengaman limitasi GAS)
            const bodyPayload = { ...payload, kontrol: 'proteksi' };
            if (localToken) bodyPayload.token = localToken;

            try {
                const response = await fetch(API_ENDPOINT, { 
                    method: 'POST', 
                    headers: headers, 
                    credentials: 'include', // Mengirim Cookie SSO ke Cloudflare Worker
                    body: JSON.stringify(bodyPayload) 
                });
                
                const result = await response.json();
                
                if (result.status === 'error' && (result.message.toLowerCase().includes('sesi') || result.message.toLowerCase().includes('token'))) {
                    this.showNotification('Sesi otentikasi berakhir. Silakan login kembali.', true);
                    setTimeout(() => {
                        localStorage.removeItem('sessionToken');
                        sessionStorage.removeItem('sessionToken');
                        window.location.href = 'index.html';
                    }, 1500);
                }
                return result;
            } catch (e) {
                return { status: 'error', message: 'Koneksi API terputus.' };
            }
        },

        async getDashboardData() {
            const response = await this.callApi({ action: 'getDashboardData' });
            if (response.status === 'success' || response.status === 'sukses') {
                this.userData = response.userData || {};
                this.profileForm.nama = this.userData.nama;
                this.dashboardSummary = response.dashboardSummary || {}; 
            } else {
                throw new Error("Sesi tidak valid di database.");
            }
        },

        // ===============================================================
        // == FUNGSI NOTIFIKASI BROADCAST GLOBAL
        // ===============================================================
        async loadNotifications() {
            try {
                const response = await this.callApi({ action: 'getNotif' });
                if (response.status === 'success' || response.status === 'sukses') {
                    this.notifications = response.data || [];
                    console.log("Notifikasi termuat: ", this.notifications); // Log untuk pengecekan
                }
            } catch (e) {
                console.error("Gagal menarik notifikasi global:", e);
            }
        },
        async markNotificationsAsRead() {
            this.unreadCount = 0;
        },

        // ===============================================================
        // == TABEL: ASET DIGITAL, BONUS, & TUTORIALS (Ver. Baru: tableItems)
        // ===============================================================
        async loadAsetDigital() {
            this.isTableLoading = true;
            this.tableItems = [];
            const res = await this.callApi({ action: 'getAsetDigital' });
            if (res.status === 'success') this.tableItems = res.data || [];
            this.isTableLoading = false;
        },
        async loadBonus() {
            this.isTableLoading = true;
            this.tableItems = [];
            const res = await this.callApi({ action: 'getBonus' });
            if (res.status === 'success') this.tableItems = res.data || [];
            this.isTableLoading = false;
        },
        async loadTutorials() {
            this.isTableLoading = true;
            this.tableItems = [];
            const res = await this.callApi({ action: 'getTutorials' });
            if (res.status === 'success') this.tableItems = res.data || [];
            this.isTableLoading = false;
        },

        // ===============================================================
        // == FITUR KLAIM VOUCHER
        // ===============================================================
        async klaimProduk() {
            // Deteksi input dari form lama (klaimKode) atau baru (voucherCode)
            const inputKode = this.voucherCode || this.klaimKode;
            
            if (!inputKode.trim()) return this.showNotification('Masukkan kode klaim.', true);
            this.isClaiming = true;
            
            const response = await this.callApi({ action: 'claimProduct', voucherCode: inputKode });
            
            this.isClaiming = false;
            
            if (response.status === 'success') {
                this.showNotification(response.message || 'Klaim Voucher berhasil!');
                this.voucherCode = '';
                this.klaimKode = '';
                
                // Refresh data laci produk otomatis
                if(this.activeView === 'aset-produk') {
                     this.loadAsetDigital();
                } else if(this.activeView === 'aset' && this.assetSubView === 'produk'){
                     this.loadDigitalAssets();
                }
            } else {
                this.showNotification(response.message || 'Gagal menebus voucher.', true);
            }
        },
        
        // Jembatan untuk sinkronisasi form html lama
        async claimProduct() {
            await this.klaimProduk();
        },

        // ===============================================================
        // == MITRA AFILIASI
        // ===============================================================
        async loadAffiliateData() {
            try {
                const res = await this.callApi({ action: 'getAffiliateData' });
                if (res.status === 'success') this.affiliateData = res.data;
            } catch (e) {
                console.error("Gagal tarik data afiliasi:", e);
            }
        },
        copyAffiliateLink() {
            if (this.affiliateData.link) {
                navigator.clipboard.writeText(this.affiliateData.link);
                alert('Tautan afiliasi unik Anda telah berhasil disalin!');
            }
        },

        // ===============================================================
        // == PROFILE & KEAMANAN AKUN
        // ===============================================================
        async updateProfile() {
            const inputNama = this.profileForm.nama || this.userData.nama;
            
            if (!inputNama.trim()) return this.showNotification('Nama tidak boleh kosong.', true);
            this.showNotification('Menyimpan perubahan nama...');
            
            const response = await this.callApi({ action: 'updateProfile', payload: { newName: inputNama } });
            
            if (response.status === 'success') {
                this.userData.nama = inputNama; // Perbarui UI lokal
                this.showNotification('Nama profil berhasil diperbarui.');
            } else {
                this.showNotification(response.message || 'Gagal memperbarui profil.', true);
            }
        },
        
        async changePassword() {
            const oldPass = this.passwordForm.oldPassword || this.passwordFields.old;
            const newPass = this.passwordForm.newPassword || this.passwordFields.new;
            
            if (!oldPass || !newPass) return this.showNotification('Semua kolom password wajib diisi.', true);
            
            this.showNotification('Mengamankan kata sandi baru...');
            
            const response = await this.callApi({ 
                action: 'changePassword', 
                payload: { oldPassword: oldPass, newPassword: newPass } 
            });
            
            if (response.status === 'success') {
                this.showNotification('Sandi berhasil diperbarui secara terenkripsi.');
                this.passwordForm = { oldPassword: '', newPassword: '' };
                this.passwordFields = { old: '', new: '' };
            } else {
                this.showNotification(response.message || 'Gagal mengubah password.', true);
            }
        },

        // ===============================================================
        // == AKSES PANEL ADMIN
        // ===============================================================
        async requestAdminAccess() {
            this.showNotification('Memeriksa izin Administrator...');
            const response = await this.callApi({ action: 'requestAdminAccess' });
            if (response.status === 'success') {
                window.location.href = 'otp-admin.html'; 
            } else {
                this.showNotification(response.message || 'Akses ke Panel Admin ditolak.', true);
            }
        },
        
        showNotification(message, isError = false) {
            this.modal.title = isError ? 'Terjadi Kesalahan' : 'Pemberitahuan';
            this.modal.message = message;
            this.modal.isError = isError;
            this.modal.isOpen = true;
            // Jika ada UI modal, bisa digunakan di sini. Jika tidak ada fallback ke alert:
            if(!document.getElementById('notification-modal')) {
                alert(message);
            }
        },
        
        async logout() {
            this.showNotification('Menghapus sesi...');
            await this.callApi({ action: 'logout' });
            localStorage.removeItem('sessionToken');
            sessionStorage.removeItem('sessionToken');
            sessionStorage.removeItem('adminAkses');
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        }
    };
}
