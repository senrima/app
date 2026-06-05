// ===============================================================
// S-TOOLS ID - GOOGLE SIGN-IN HANDLER (SSO BRIDGE)
// ===============================================================

// Fungsi yang dipanggil oleh Google setelah pengguna memilih akun
async function handleCredentialResponse(response) {
    try {
        // Dekode JWT Token dari Google untuk mendapatkan profil
        const responsePayload = jwt_decode(response.credential);

        console.log("Mencoba Autentikasi SSO untuk: " + responsePayload.email);

        // Kirim data profil Google ke Cloudflare Worker (Satu Pintu Akses)
        const res = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                kontrol: 'proteksi',
                action: 'googleAuth',
                email: responsePayload.email,
                nama: responsePayload.name,
                id: responsePayload.sub // ID Unik Google dimasukkan sebagai properti id
            })
        });

        const result = await res.json();

        // Jika Worker & GAS menyatakan sukses dan membuatkan sesi
        if (result.status === 'success' || result.status === 'login_success') {
            
            // Simpan token ke localStorage sebagai cadangan autentikasi (Pendekatan B)
            localStorage.setItem('sessionToken', result.token);
            
            console.log("Sesi SSO aktif. Mengalihkan ke dashboard...");
            
            // Pintu Terbuka: Alihkan pengguna langsung ke dashboard baru
            window.location.href = 'dashboard-new.html';
        } else {
            alert(result.message || 'Gagal menyelaraskan akun dengan sistem SSO.');
        }

    } catch (error) {
        console.error("Error pada jembatan SSO Google:", error);
        alert('Gagal terhubung ke server autentikasi API Gateway.');
    }
}

// Inisialisasi Google Sign-In GSI Platform saat halaman dimuat
window.onload = function () {
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
    });
    
    // Hubungkan ke tombol kustom login jika ada di UI
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            google.accounts.id.prompt();
        });
    }

    // Memicu fitur One-Tap login otomatis jika sesi Google pengguna sudah aktif
    google.accounts.id.prompt(); 
};

// Fungsi Utilitas pembantu untuk mendekode enkripsi JWT dari Google
function jwt_decode(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('0' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}
