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
                    // Beri penanda khusus di session browser bahwa admin ini sudah lolos OTP
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
        
        // Manajemen Pengguna
        users: [],
        isUsersLoading: false,
        usersSearchQuery: '',
        usersCurrentPage: 1,
        usersItemsPerPage: 10,
        
        // Modal Edit Pengguna
        isUserModalOpen: false,
        userToEdit: {},
        
        // Broadcast
        templates: { dashboard: [], channel: [] },
        selectedTemplate: '',
        broadcast: {
            dashboard: { judul: '', pesan: '', link: '' },
            channel: { subjek: '', pesanHtml: '', pesanTeks: '' }
        },

        async init() {
            // Cek Ganda: Harus punya token regular DAN tiket akses admin dari OTP
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

        // --- Logika Tabel Pengguna ---
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

        // --- Modal Edit ---
        openUserModal(user) {
            this.userToEdit = JSON.parse(JSON.stringify(user)); // Copy data
            this.isUserModalOpen = true;
        },
        closeUserModal() { this.isUserModalOpen = false; },
        async saveUserUpdate() {
            const btn = event.target;
            const originalText = btn.innerText;
            btn.innerText = 'Menyimpan...';
            btn.disabled = true;

            const payload = {
                action: 'updateAdminUser',
                userId: this.userToEdit.ID,
                newUsername: this.userToEdit.Username,
                newStatus: this.userToEdit.Status,
                newNotifPref: this.userToEdit.NotifReferensi
            };

            const response = await this.callAdminApi(payload);

            btn.innerText = originalText;
            btn.disabled = false;

            if (response.status === 'success') {
                this.closeUserModal();
                this.loadUsers(); // Refresh tabel secara otomatis
                alert('Berhasil! Data pengguna telah diperbarui.');
            } else {
                alert(response.message || 'Gagal menyimpan perubahan.');
            }
        },

        // --- Broadcast Dummy ---
        applyTemplate() {},
        async sendDashboardBroadcast() {
            if (!this.broadcast.dashboard.judul || !this.broadcast.dashboard.pesan) {
                return alert("Judul dan Pesan wajib diisi!");
            }
            const btn = event.target; btn.innerText = "Memproses..."; btn.disabled = true;
            
            const payload = { action: 'sendBroadcast', type: 'dashboard', broadcastData: this.broadcast.dashboard };
            const res = await this.callAdminApi(payload);
            
            btn.innerText = "Kirim ke Semua Pengguna"; btn.disabled = false;
            if (res.status === 'success') { alert(res.message); this.broadcast.dashboard = { judul: '', pesan: '', link: '' }; } 
            else alert(res.message);
        },

        async sendChannelBroadcast() {
            if (!this.broadcast.channel.subjek || !this.broadcast.channel.pesanHtml) {
                return alert("Subjek dan Pesan HTML wajib diisi!");
            }
            const btn = event.target; btn.innerText = "Mengirim Email..."; btn.disabled = true;
            
            const payload = { action: 'sendBroadcast', type: 'channel', broadcastData: this.broadcast.channel };
            const res = await this.callAdminApi(payload);
            
            btn.innerText = "Kirim Broadcast"; btn.disabled = false;
            if (res.status === 'success') { alert(res.message); this.broadcast.channel = { subjek: '', pesanHtml: '', pesanTeks: '' }; } 
            else alert(res.message);
        }
    };
}
