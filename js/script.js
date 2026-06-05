// ===============================================================
// S-TOOLS ID - GOOGLE SIGN-IN HANDLER (SSO BRIDGE)
// ===============================================================

async function handleCredentialResponse(response) {
    try {
        const responsePayload = jwt_decode(response.credential);
        
        // API_ENDPOINT sudah dideklarasikan di main.js
        const res = await fetch(API_ENDPOINT, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                kontrol: 'proteksi',
                action: 'googleAuth',
                email: responsePayload.email,
                nama: responsePayload.name,
                id: responsePayload.sub
            })
        });

        const result = await res.json();
        
        if (result.status === 'success' || result.status === 'login_success') {
            localStorage.setItem('sessionToken', result.token);
            window.location.href = 'dashboard-new.html';
        } else {
            alert(result.message || 'Gagal login SSO.');
        }
    } catch (error) {
        console.error("Error SSO:", error);
    }
}

window.onload = function () {
    // GOOGLE_CLIENT_ID sudah dideklarasikan di main.js
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID, 
        callback: handleCredentialResponse
    });
    
    // Sesuaikan dengan ID tombol di index.html
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            google.accounts.id.prompt();
        });
    }

    google.accounts.id.prompt(); 
};

function jwt_decode(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('0' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}
