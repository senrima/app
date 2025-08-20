// Ganti dengan kredensial Anda!
const GOOGLE_CLIENT_ID = '140122260876-rea6sfsmcd32acgie6ko7hrr2rj65q6v.apps.googleusercontent.com';
const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxxThd7kcVwnebStiKVtzslM2bSe5uKpjQM9XrDFbQClROW3QgAwBWoOTFYAimkJLU8/exec';

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfoDiv = document.getElementById('userInfo');
const userNameEl = document.getElementById('userName');
const userEmailEl = document.getElementById('userEmail');
const userImgEl = document.getElementById('userImg');

// Fungsi untuk menangani respons dari Google
function handleCredentialResponse(response) {
    // Mendekode JWT untuk mendapatkan profil pengguna
    const responsePayload = jwt_decode(response.credential);

    console.log("ID: " + responsePayload.sub);
    console.log('Full Name: ' + responsePayload.name);
    console.log('Email: ' + responsePayload.email);
    console.log('Image URL: ' + responsePayload.picture);

    // Menampilkan informasi pengguna
    updateUI(responsePayload.name, responsePayload.email, responsePayload.picture);

    // Mengirim data ke Google Sheets
    sendDataToSheet(responsePayload.sub, responsePayload.name, responsePayload.email, responsePayload.picture);
}

// Fungsi untuk mengirim data ke Google Sheet melalui Apps Script
function sendDataToSheet(sub, nama, email, gambar) {
    const data = { sub, nama, email, gambar };

    fetch(GOOGLE_SHEET_API_URL, {
        method: 'POST',
        mode: 'no-cors', // Penting untuk menghindari error CORS saat deploy
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        // Karena mode 'no-cors', kita tidak bisa membaca responsnya
        console.log("Permintaan terkirim ke Google Sheet.");
        alert("Login berhasil! Data Anda telah direkam.");
    })
    .catch(error => {
        console.error('Error:', error);
        alert("Gagal mengirim data ke server.");
    });
}

// Fungsi untuk memperbarui tampilan halaman
function updateUI(name, email, picture) {
    loginBtn.classList.add('hidden');
    userInfoDiv.classList.remove('hidden');
    userNameEl.textContent = name;
    userEmailEl.textContent = email;
    userImgEl.src = picture;
}

// Fungsi untuk logout
logoutBtn.addEventListener('click', () => {
    google.accounts.id.disableAutoSelect();
    userInfoDiv.classList.add('hidden');
    loginBtn.classList.remove('hidden');
    console.log("Pengguna telah logout.");
});

// Inisialisasi saat halaman dimuat
window.onload = function () {
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
    });
    
    // Alih-alih merender tombol, kita tambahkan event listener
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.addEventListener('click', () => {
        // Tampilkan popup "one-tap" ketika tombol kustom kita diklik
        google.accounts.id.prompt();
    });

    // Anda tetap bisa memanggil prompt() di awal untuk login otomatis
    // jika pengguna sudah pernah login sebelumnya.
    // Jika tidak ingin ada popup otomatis, hapus baris di bawah ini.
    google.accounts.id.prompt(); 
};

// Fungsi untuk mendekode JWT (diperlukan karena Google mengembalikan token JWT)
function jwt_decode(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);

}


