const API_ENDPOINT = "https://api.s-tools.id";

function dashboardApp() {
    return {
        // STATE UTAMA
        isLoading: true,
        isSidebarOpen: false,
        activeView: 'beranda',
        darkMode: false,

        // MESIN TOAST NOTIFICATION
        toasts: [],
        addToast(message, type = 'success') {
            const id = Date.now();
            this.toasts.push({ id, message, type, visible: true });
            setTimeout(() => this.removeToast(id), 3500); 
        },
        removeToast(id) {
            const toast = this.toasts.find(t => t.id === id);
            if (toast) toast.visible = false;
            setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 300);
        },

        // DATA PENGGUNA
        userData: { nama: '', email: '', status: '', koin: 0, statusAfiliasi: 'Tidak Aktif' },
        notifications: [],
        
        tableItems: [],
        transaksiItems: [], 
        isTableLoading: false, // Digunakan untuk tombol Segarkan
        
        voucherCode: '',
        isClaiming: false,
        
        profileForm: { nama: '' },
        passwordForm: { oldPassword: '', newPassword: '' },
        affiliateData: { kode: '', status: '', koin: 0, link: '' },

        async init() {
            this.isLoading = true;
            try {
                await this.getDashboardData();
                await Promise.all([
                    this.loadNotifications(),
                    this.loadAffiliateData()
                ]);
            } catch (e) {
                console.error("Gagal inisialisasi, membakar token dan logout:", e);
                this.destroyTokenAndKick();
            } finally {
                this.isLoading = false;
            }
        },

        destroyTokenAndKick() {
            localStorage.removeItem('sessionToken');
            sessionStorage.removeItem('sessionToken');
            window.location.replace('index.html'); 
        },

        async callApi(payload) {
            const localToken = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken') || '';
            const headers = { 'Content-Type': 'application/json' };
            if (localToken) headers['x-auth-token'] = localToken;

            const bodyPayload = { ...payload, kontrol: 'proteksi' };
            if (localToken) bodyPayload.token = localToken;

            try {
                const response = await fetch(API_ENDPOINT, { 
                    method: 'POST', 
                    headers: headers, 
                    credentials: 'include',
                    body: JSON.stringify(bodyPayload) 
                });
                
                const result = await response.json();
                
                if (result.status === 'error' && (result.message.toLowerCase().includes('sesi') || result.message.toLowerCase().includes('token'))) {
                    this.addToast('Sesi berakhir atau tidak valid.', 'error');
                    setTimeout(() => {
                        this.destroyTokenAndKick();
                    }, 500); 
                }
                return result;
            } catch (e) {
                console.error("API Call Exception:", e);
                return { status: 'error', message: 'Koneksi API terputus.' };
            }
        },

        async getDashboardData() {
            const response = await this.callApi({ action: 'getDashboardData' });
            if (response.status === 'success') {
                this.userData = response.userData || {};
                this.profileForm.nama = this.userData.nama;
            } else {
                throw new Error("Sesi tidak valid / Ditolak Database");
            }
        },

        async loadNotifications() {
            const response = await this.callApi({ action: 'getNotif' });
            if (response.status === 'success') this.notifications = response.data || [];
        },

        async loadAsetDigital() {
            this.tableItems = [];
            const res = await this.callApi({ action: 'getAsetDigital' });
            if (res.status === 'success') this.tableItems = res.data || [];
        },
        async loadBonus() {
            this.tableItems = [];
            const res = await this.callApi({ action: 'getBonus' });
            if (res.status === 'success') this.tableItems = res.data || [];
        },

        // FITUR BARU: LOAD RIWAYAT TRANSAKSI & TOMBOL SEGARKAN
        async loadRiwayatTransaksi() {
            this.isTableLoading = true; // Nyalakan animasi loading
            this.transaksiItems = [];
            try {
                const res = await this.callApi({ action: 'getRiwayatTransaksi' });
                if (res.status === 'success') {
                    this.transaksiItems = res.data || [];
                    // Jika dipanggil oleh tombol segarkan secara manual (bukan pertama kali buka menu)
                    if(this.activeView === 'riwayat-transaksi') {
                        this.addToast('Data transaksi berhasil diperbarui', 'success');
                    }
                } else {
                    this.addToast(res.message || 'Gagal memuat riwayat transaksi.', 'error');
                }
            } finally {
                this.isTableLoading = false; // Matikan animasi
            }
        },

        async claimProduct() {
            if (!this.voucherCode.trim()) return this.addToast('Masukkan kode klaim.', 'error');
            this.isClaiming = true;
            
            const res = await this.callApi({ action: 'claimProduct', voucherCode: this.voucherCode });
            this.isClaiming = false;
            
            if (res.status === 'success') {
                this.addToast(res.message || 'Berhasil diklaim!', 'success');
                this.voucherCode = '';
                if(this.activeView === 'aset-produk') this.loadAsetDigital();
            } else {
                this.addToast(res.message || 'Gagal menebus voucher.', 'error');
            }
        },

        async loadAffiliateData() {
            const res = await this.callApi({ action: 'getAffiliateData' });
            if (res.status === 'success') this.affiliateData = res.data;
        },
        
        copyAffiliateLink() {
            if (this.affiliateData.link) {
                navigator.clipboard.writeText(this.affiliateData.link);
                this.addToast('Tautan afiliasi disalin!', 'success');
            }
        },

        async updateProfile() {
            if (!this.profileForm.nama.trim()) return this.addToast('Nama tidak boleh kosong.', 'error');
            
            const res = await this.callApi({ action: 'updateProfile', payload: { newName: this.profileForm.nama } });
            
            if (res.status === 'success') {
                this.userData.nama = this.profileForm.nama;
                this.addToast('Profil berhasil diperbarui.', 'success');
            } else {
                this.addToast(res.message || 'Gagal perbarui profil.', 'error');
            }
        },

        async changePassword() {
            if (!this.passwordForm.oldPassword.trim() || !this.passwordForm.newPassword.trim()) {
                return this.addToast('Sandi lama dan sandi baru wajib diisi.', 'error');
            }
            if (this.passwordForm.newPassword.length < 6) {
                return this.addToast('Sandi baru minimal 6 karakter.', 'error');
            }

            const res = await this.callApi({ 
                action: 'changePassword', 
                payload: { oldPassword: this.passwordForm.oldPassword, newPassword: this.passwordForm.newPassword } 
            });
            
            if (res.status === 'success') {
                this.addToast('Kata sandi berhasil diperbarui!', 'success');
                this.passwordForm.oldPassword = '';
                this.passwordForm.newPassword = '';
            } else {
                this.addToast(res.message || 'Gagal mengubah kata sandi.', 'error');
            }
        },

        async requestAdminAccess() {
            const res = await this.callApi({ action: 'requestAdminAccess' });
            if (res.status === 'success') {
                window.location.href = 'otp-admin.html'; 
            } else {
                this.addToast(res.message || 'Akses Ditolak.', 'error');
            }
        },
        
        async logout() {
            this.addToast('Keluar dari sesi aman...', 'success');
            await this.callApi({ action: 'logout' });
            setTimeout(() => { this.destroyTokenAndKick(); }, 500);
        }
    };
}
