/**
 * S-Tools ID - Admin Panel Controller
 */

const API_ENDPOINT = "https://api.s-tools.id";

function adminOtpApp() {
    return {
        otp: '', isLoading: false, status: { message: '', success: false },
        async submit() {
            if (this.otp.length < 6) return this.status = { message: 'Masukkan 6 digit kode.', success: false };
            this.isLoading = true; this.status = { message: 'Memverifikasi hak akses...', success: true };
            const token = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
            if (!token) { window.location.href = 'index.html'; return; }
            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                    body: JSON.stringify({ kontrol: 'proteksi', action: 'verifyAdminOTP', token: token, otp: this.otp })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    sessionStorage.setItem('adminAkses', 'sah');
                    this.status = { message: 'Akses Diberikan! Mengalihkan...', success: true };
                    setTimeout(() => window.location.href = 'dashboard-admin.html', 1000);
                } else this.status = { message: result.message || 'OTP Salah.', success: false };
            } catch (error) { this.status = { message: 'Terjadi kesalahan server.', success: false }; } 
            finally { this.isLoading = false; }
        }
    };
}

function adminDashboardApp() {
    return {
        isLoading: true, isSidebarOpen: false, activeView: 'beranda', notifSubView: 'dashboard', adminData: { nama: 'Administrator' }, darkMode: false, 
        
        toasts: [],
        addToast(message, type = 'success') {
            const id = Date.now(); this.toasts.push({ id, message, type, visible: true });
            setTimeout(() => this.removeToast(id), 3500);
        },
        removeToast(id) {
            const toast = this.toasts.find(t => t.id === id); if (toast) toast.visible = false;
            setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 300);
        },
        
        users: [], isUsersLoading: false, usersSearchQuery: '', usersCurrentPage: 1, usersItemsPerPage: 10,
        isUserModalOpen: false, userToEdit: {},
        
        templates: { dashboard: [], channel: [] }, selectedTemplate: '',
        broadcast: { dashboard: { judul: '', pesan: '', link: '' }, channel: { subjek: '', pesanHtml: '', pesanTeks: '' } },

        async init() {
            const token = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
            const akses = sessionStorage.getItem('adminAkses');
            if (!token || akses !== 'sah') { window.location.href = 'dashboard-new.html'; return; }
            this.isLoading = false;
            this.loadUsers();
        },

        async callAdminApi(payload) {
            const token = localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                    body: JSON.stringify({ kontrol: 'proteksi', token: token, ...payload })
                });
                const result = await response.json();
                if (result.message && result.message.includes('bukan Admin')) {
                    sessionStorage.removeItem('adminAkses'); window.location.href = 'dashboard-new.html';
                }
                return result;
            } catch (e) { return { status: 'error', message: 'Koneksi gagal.' }; }
        },

        async loadUsers() {
            this.isUsersLoading = true;
            const res = await this.callAdminApi({ action: 'getAdminUsers' });
            if (res.status === 'success') { this.users = res.data || []; this.usersCurrentPage = 1; } 
            else this.addToast(res.message || 'Gagal memuat data pengguna.', 'error');
            this.isUsersLoading = false;
        },
        get filteredUsers() {
            if (!this.usersSearchQuery.trim()) return this.users;
            const search = this.usersSearchQuery.toLowerCase();
            return this.users.filter(u => (u.Nama || '').toLowerCase().includes(search) || (u.Email || '').toLowerCase().includes(search) || (u.Username || '').toLowerCase().includes(search));
        },
        get paginatedUsers() { const start = (this.usersCurrentPage - 1) * this.usersItemsPerPage; return this.filteredUsers.slice(start, start + this.usersItemsPerPage); },
        get totalUsersPages() { return Math.ceil(this.filteredUsers.length / this.usersItemsPerPage) || 1; },
        nextUsersPage() { if (this.usersCurrentPage < this.totalUsersPages) this.usersCurrentPage++; },
        prevUsersPage() { if (this.usersCurrentPage > 1) this.usersCurrentPage--; },

        openUserModal(user) { this.userToEdit = JSON.parse(JSON.stringify(user)); this.isUserModalOpen = true; },
        closeUserModal() { this.isUserModalOpen = false; },
        
        async saveUserUpdate(e) {
            const btn = e ? e.target : null; let originalText = "Simpan Perubahan";
            if (btn) { originalText = btn.innerText; btn.innerText = 'Menyimpan...'; btn.disabled = true; }

            // PAYLOAD DIBUAT SUPER LENGKAP AGAR GAS LAMA TIDAK MENGHAPUS USERNAME
            const payload = {
                action: 'updateAdminUser',
                userId: this.userToEdit.ID,
                newNama: this.userToEdit.Nama,                   // Wajib 'Nama', bukan newName
                newUsername: this.userToEdit.Username,           
                newStatus: this.userToEdit.Status,               
                newNotifPref: this.userToEdit.NotifReferensi,    
                newStatusAfiliasi: this.userToEdit.StatusAfiliasi // Wajib 'StatusAfiliasi'
            };

            const response = await this.callAdminApi(payload);
            if (btn) { btn.innerText = originalText; btn.disabled = false; }

            if (response.status === 'success' || response.status === 'sukses') {
                this.closeUserModal(); await this.loadUsers(); 
                this.addToast('Berhasil! Data pengguna telah diperbarui.', 'success');
            } else this.addToast(response.message || 'Gagal menyimpan perubahan data.', 'error');
        },

        applyTemplate() {},
        async sendDashboardBroadcast(e) {
            if (!this.broadcast.dashboard.judul || !this.broadcast.dashboard.pesan) return this.addToast("Judul dan Pesan wajib diisi!", "error");
            const btn = e ? e.target.querySelector('button[type="submit"]') : null; let originalText = "Publikasikan Siaran";
            if (btn) { originalText = btn.innerText; btn.innerText = "Mengirim..."; btn.disabled = true; }
    
            const payload = { action: 'sendBroadcast', type: 'dashboard', broadcastData: this.broadcast.dashboard };
            const res = await this.callAdminApi(payload);
    
            if (btn) { btn.innerText = originalText; btn.disabled = false; }
            if (res.status === 'success') { this.addToast('Notifikasi berhasil dipublikasikan!', 'success'); this.broadcast.dashboard = { judul: '', pesan: '', link: '' }; } 
            else this.addToast('Gagal: ' + (res.message || 'Terjadi kesalahan sistem.'), 'error'); 
        }
    };
}
