// ===============================================================
// == JAVASCRIPT UNTUK SEMUA HALAMAN ADMIN ==
// ===============================================================

const API_ENDPOINT = "https://api.senrima.web.id";

// ---------------------------------------------------------------
// -- Otak untuk halaman otp-admin.html
// ---------------------------------------------------------------
function adminOtpApp() {
    return {
        isLoading: false,
        otp: '',
        status: { message: '', success: false },
        
        async submit() {
            this.isLoading = true;
            this.status = { message: '', success: false };
            
            const email = sessionStorage.getItem('adminEmailForOTP');
            
            if (!email) {
                this.status.message = 'Sesi admin tidak ditemukan. Silakan minta akses ulang dari dasbor.';
                this.status.success = false;
                this.isLoading = false;
                return;
            }

            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        kontrol: 'proteksi', 
                        action: 'verifyAdminOtp',
                        payload: { email: email, otp: this.otp }
                    })
                });
                
                const result = await response.json();
                
                if (result.status === 'success' && result.token) {
                    this.status.message = 'Verifikasi berhasil! Mengarahkan ke dasbor admin...';
                    this.status.success = true;
                    
                    sessionStorage.removeItem('adminEmailForOTP');
                    
                    window.location.href = `Dashboard-admin.html?token=${result.token}`;
                } else {
                   this.status.message = result.message || 'Terjadi kesalahan.';
                   this.status.success = false;
                }

            } catch (e) {
                this.status.message = 'Gagal terhubung ke server.';
                this.status.success = false;
            } finally {
                this.isLoading = false;
            }
        }
    };
}


// ---------------------------------------------------------------
// -- Otak untuk halaman Dashboard-admin.html
// ---------------------------------------------------------------
function adminDashboardApp() {
    return {
        // State Utama
        isLoading: true,
        isSidebarOpen: false,
        activeView: 'beranda',
        adminSessionToken: null,
        adminData: {},

        // State untuk Manajemen Pengguna
        users: [],
        isUsersLoading: false,
        usersSearchQuery: '',
        usersCurrentPage: 1,
        usersItemsPerPage: 10,
        isUserModalOpen: false,
        userToEdit: { ID: null, Status: '', Username: '', NotifReferensi: '' },

        notifSubView: 'dashboard', // Submenu default
        broadcast: {
            dashboard: { judul: '', pesan: '', link: '' },
            channel: { subjek: '', pesanTeks: '' }
        },

        // Fungsi inisialisasi
        async init() {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            if (!token) {
                alert('Akses tidak sah. Token admin tidak ditemukan.');
                window.location.href = 'index.html';
                return;
            }
            this.adminSessionToken = token;
            
            try {
                const response = await this.callApi({ action: 'verifySession' });
                if (response.status === 'success') {
                    this.adminData = response.adminData;
                    this.isLoading = false;
                } else {
                    throw new Error(response.message || 'Sesi admin tidak valid.');
                }
            } catch (error) {
                alert('Sesi admin gagal diverifikasi: ' + error.message);
                window.location.href = 'index.html';
            }
        },

        // Fungsi helper untuk semua panggilan API admin
        async callApi(payload) {
            const headers = { 'Content-Type': 'application/json' };
            const body = JSON.stringify({
                kontrol: 'admin',
                token: this.adminSessionToken,
                action: payload.action,
                payload: payload.payload || {}
            });

            const response = await fetch(API_ENDPOINT, { method: 'POST', headers, body });
            return await response.json();
        },
        
        // Computed Properties & Fungsi untuk Manajemen Pengguna
        get filteredUsers() {
            if (!this.usersSearchQuery) return this.users;
            this.usersCurrentPage = 1;
            const search = this.usersSearchQuery.toLowerCase();
            return this.users.filter(user => 
                user.Nama.toLowerCase().includes(search) || 
                user.Email.toLowerCase().includes(search) ||
                user.Username.toLowerCase().includes(search)
            );
        },
        get paginatedUsers() {
            const start = (this.usersCurrentPage - 1) * this.usersItemsPerPage;
            return this.filteredUsers.slice(start, start + this.usersItemsPerPage);
        },
        get totalUsersPages() {
            return Math.ceil(this.filteredUsers.length / this.usersItemsPerPage);
        },
        nextUsersPage() { if (this.usersCurrentPage < this.totalUsersPages) this.usersCurrentPage++; },
        prevUsersPage() { if (this.usersCurrentPage > 1) this.usersCurrentPage--; },

        async loadUsers() {
            if (this.users.length > 0) return;
            this.isUsersLoading = true;
            const response = await this.callApi({ action: 'adminGetAllUsers' });
            this.isUsersLoading = false;
            if (response.status === 'success') {
                this.users = response.data || [];
            }
        },

        openUserModal(user) {
            this.userToEdit = {
                ID: user.ID,
                Nama: user.Nama, // <-- TAMBAHKAN BARIS INI
                Status: user.Status,
                Username: user.Username,
                NotifReferensi: user.NotifReferensi
            };
            this.isUserModalOpen = true;
        },
        
        closeUserModal() {
            this.isUserModalOpen = false;
        },
        async saveUserUpdate() {
            const response = await this.callApi({ 
                action: 'adminUpdateUser', 
                payload: this.userToEdit 
            });

            if (response.status === 'success') {
                alert('Data berhasil diperbarui!');
                this.closeUserModal();
                this.users = []; 
                await this.loadUsers();
            } else {
                alert('Gagal memperbarui: ' + response.message);
            }
        },

        async sendDashboardBroadcast() {
            if (!this.broadcast.dashboard.judul || !this.broadcast.dashboard.pesan) {
                alert('Judul dan Pesan harus diisi.');
                return;
            }
            if (!confirm('Anda yakin ingin mengirim notifikasi ini ke SEMUA pengguna?')) return;
        
            const response = await this.callApi({
                action: 'broadcastDashboard',
                payload: this.broadcast.dashboard
            });
            alert(response.message);
            if (response.status === 'success') {
                this.broadcast.dashboard = { judul: '', pesan: '', link: '' }; // Reset form
            }
        },
        
        async sendChannelBroadcast() {
            if (!this.broadcast.channel.subjek || !this.broadcast.channel.pesanTeks) {
                alert('Subjek dan Pesan harus diisi.');
                return;
            }
            if (!confirm('Anda yakin ingin mengirim broadcast Email/Telegram ini ke SEMUA pengguna?')) return;
        
            const response = await this.callApi({
                action: 'broadcastChannel',
                payload: {
                    subjek: this.broadcast.channel.subjek,
                    pesanTeks: this.broadcast.channel.pesanTeks,
                    pesanHtml: this.broadcast.channel.pesanTeks // Untuk email, kita gunakan teks yang sama
                }
            });
            alert(response.message);
            if (response.status === 'success') {
                this.broadcast.channel = { subjek: '', pesanTeks: '' }; // Reset form
            }
        },

        // Fungsi logout
        logout() {
            console.log('Logout admin...');
            window.location.href = 'index.html';
        }
    };
}


