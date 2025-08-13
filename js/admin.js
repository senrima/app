// Definisikan URL API Anda di sini
const API_ENDPOINT = "https://api.senrima.web.id";

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
            if (this.users.length > 0) return; // Cache sederhana, gunakan tombol refresh untuk muat ulang
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
                Status: user.Status,
                Username: user.Username,
                NotifReferensi: user.NotifReferensi // Pastikan nama kolom ini benar di GAS Anda
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
                // Kosongkan array users dan panggil loadUsers() untuk refresh data
                this.users = []; 
                await this.loadUsers();
            } else {
                alert('Gagal memperbarui: ' + response.message);
            }
        },

        // Fungsi logout
        logout() {
            console.log('Logout admin...');
            window.location.href = 'index.html';
        }
    };
}