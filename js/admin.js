/**
 * S-Tools ID - Admin Panel Controller
 */

const API_ENDPOINT = "https://api.s-tools.id";

// ===============================================================
// 1. KONTROLER OTP ADMIN (otp-admin.html)
// ===============================================================
function adminOtpApp() {
    return {
        otp: '',
        isLoading: false,
        status: { message: '', success: false },
        
        async submit() {
            if (this.otp.length < 6) return this.status = { message: 'Masukkan 6 digit kode.', success: false };
            
            this.isLoading = true;
            this.status = { message: 'Memverifikasi hak akses...', success: true };
            
            const token = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
            if (!token) {
                window.location.href = 'index.html';
                return;
            }

            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ kontrol: 'proteksi', action: 'verifyAdminOTP', token: token, otp: this.otp })
                });

                const result = await response.json();

                if (result.status === 'success') {
                    sessionStorage.setItem('adminAkses', 'sah');
                    this.status = { message: 'Akses Diberikan! Mengalihkan...', success: true };
                    setTimeout(() => window.location.href = 'dashboard-admin.html', 1000);
                } else {
                    this.status = { message: result.message || 'OTP Salah.', success: false };
                }
            } catch (error) {
                this.status = { message: 'Terjadi kesalahan server.', success: false };
            } finally {
                this.isLoading = false;
            }
        }
    };
}

// ===============================================================
// 2. KONTROLER DASHBOARD ADMIN (dashboard-admin.html)
// ===============================================================
function adminDashboardApp() {
    return {
        isLoading: true,
        isSidebarOpen: false,
        activeView: 'beranda', 
        notifSubView: 'dashboard',
        adminData: { nama: 'Administrator' },
        darkMode: false, 
        
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
        
        // Manajemen Pengguna State
        users: [],
        isUsersLoading: false,
        usersSearchQuery: '',
        usersCurrentPage: 1,
        usersItemsPerPage: 10,
        
        // Modal Edit Pengguna
        isUserModalOpen: false,
        userToEdit: {},
        
        // Broadcast State
        templates: { dashboard: [], channel: [] },
        selectedTemplate: '',
        broadcast: {
            dashboard: { judul: '', pesan: '', link: '' },
            channel: { subjek: '', pesanHtml: '', pesanTeks: '' }
        },

        async init() {
            const token = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
            const akses = sessionStorage.getItem('adminAkses');
            
            if (!token || akses !== 'sah') {
                window.location.href = 'dashboard-new.html';
                return;
            }
            this.isLoading = false;
        },

        async callAdminApi(payload) {
            const token = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ kontrol: 'proteksi', token: token, ...payload })
                });
                const result = await response.json();
                if (result.message && result.message.includes('bukan Admin')) {
                    sessionStorage.removeItem('adminAkses');
                    window.location.href = 'dashboard-new.html';
                }
                return result;
            } catch (e) {
                return { status: 'error', message: 'Koneksi gagal.' };
            }
        },

        // --- Ambil Data Tabel Pengguna ---
        async loadUsers() {
            this.isUsersLoading = true;
            const res = await this.callAdminApi({ action: 'getAdminUsers' });
            if (res.status === 'success') this.users = res.data || [];
            this.isUsersLoading = false;
        },
        get filteredUsers() {
            if (!this.usersSearchQuery.trim()) return this.users;
            this.usersCurrentPage = 1;
            const search = this.usersSearchQuery.toLowerCase();
            return this.users.filter(u => u.Nama.toLowerCase().includes(search) || u.Email.toLowerCase().includes(search) || (u.Username || '').toLowerCase().includes(search));
        },
        get paginatedUsers() {
            const start = (this.usersCurrentPage - 1) * this.usersItemsPerPage;
            return this.filteredUsers.slice(start, start + this.usersItemsPerPage);
        },
        get totalUsersPages() { return Math.ceil(this.filteredUsers.length / this.usersItemsPerPage) || 1; },
        nextUsersPage() { if (this.usersCurrentPage < this.totalUsersPages) this.usersCurrentPage++; },
        prevUsersPage() { if (this.usersCurrentPage > 1) this.usersCurrentPage--; },

        // --- Penanganan Modal Edit Pengguna ---
        openUserModal(user) {
            this.userToEdit = JSON.parse(JSON.stringify(user)); 
            this.isUserModalOpen = true;
        },
        closeUserModal() { 
            this.isUserModalOpen = false; 
        },
        
        // --- SIMPAN DATA PERUBAHAN BARU SINKRON KE backend ---
        async saveUserUpdate(e) {
            const btn = e ? e.target : null;
            let originalText = "Simpan Perubahan";
            if (btn) {
                originalText = btn.innerText;
                btn.innerText = 'Menyimpan...';
                btn.disabled = true;
            }

            const payload = {
                action: 'updateAdminUser',
                userId: this.userToEdit.ID,
                newNama: this.userToEdit.Nama,                   // Opsi 1: Nama Lengkap
                newStatus: this.userToEdit.Status,               // Opsi 2: Status (Aktif / Diblokir)
                newNotifPref: this.userToEdit.NotifReferensi,    // Opsi 3: NotifPreference (email / telegram)
                newStatusAfiliasi: this.userToEdit.StatusAfiliasi // Opsi 4: StatusAfiliasi (Aktif / Tidak Aktif)
            };

            const response = await this.callAdminApi(payload);

            if (btn) {
                btn.innerText = originalText;
                btn.disabled = false;
            }

            if (response.status === 'success' || response.status === 'sukses') {
                this.closeUserModal();
                await this.loadUsers(); // Refresh instan baris tabel data tanpa reload
                this.addToast('Berhasil! Parameter data pengguna telah diperbarui.', 'success');
            } else {
                this.addToast(response.message || 'Gagal menyimpan perubahan data.', 'error');
            }
        },

        // --- Kirim Broadcast Notifikasi ---
        applyTemplate() {},
        async sendDashboardBroadcast(e) {
            if (!this.broadcast.dashboard.judul || !this.broadcast.dashboard.pesan) {
                this.addToast("Judul dan Pesan wajib diisi!", "error");
                return;
            }
    
            const btn = e ? e.target.querySelector('button[type="submit"]') : null;
            let originalText = "Publikasikan Siaran";
            
            if (btn) {
                originalText = btn.innerText;
                btn.innerText = "Mengirim..."; 
                btn.disabled = true;
            }
    
            const payload = { 
                action: 'sendBroadcast', 
                type: 'dashboard', 
                broadcastData: this.broadcast.dashboard 
            };
    
            const res = await this.callAdminApi(payload);
    
            if (btn) {
                btn.innerText = originalText; 
                btn.disabled = false;
            }
    
            if (res.status === 'success') { 
                this.addToast('Notifikasi berhasil dipublikasikan ke dasbor semua pengguna!', 'success');
                this.broadcast.dashboard = { judul: '', pesan: '', link: '' }; 
            } else { 
                this.addToast('Gagal: ' + (res.message || 'Terjadi kesalahan sistem.'), 'error'); 
            }
        },

        async sendChannelBroadcast(e) {
            if (!this.broadcast.channel.subjek || !this.broadcast.channel.pesanHtml) {
                this.addToast("Subjek dan Pesan HTML wajib diisi!", "error");
                return;
            }
            const btn = e ? e.target.querySelector('button[type="submit"]') : null;
            let originalText = "Kirim Broadcast";
            if (btn) {
                originalText = btn.innerText;
                btn.innerText = "Mengirim Email..."; 
                btn.disabled = true;
            }
            
            const payload = { action: 'sendBroadcast', type: 'channel', broadcastData: this.broadcast.channel };
            const res = await this.callAdminApi(payload);
            
            if (btn) {
                btn.innerText = originalText; 
                btn.disabled = false;
            }
            if (res.status === 'success') { 
                this.addToast(res.message, 'success'); 
                this.broadcast.channel = { subjek: '', pesanHtml: '', pesanTeks: '' }; 
            } else {
                this.addToast(res.message, 'error');
            }
        }
    };
}
