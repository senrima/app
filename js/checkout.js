// ===============================================================
// == JAVASCRIPT LENGKAP UNTUK HALAMAN CHECKOUT ==
// ===============================================================

// ---------------------------------------------------------------
// -- PENGATURAN & KONSTANTA
// ---------------------------------------------------------------
const API_URL = 'https://api.senrima.web.id';

const PAYMENT_METHODS = {
  "Transfer": {
    isDirect: true,
    providers: [
      { name: "Transfer Bank", code: "TRANSFER" }
    ]
  },
  "QRIS": {
    isDirect: true,
    providers: [
      { name: "QRIS (segera hadir)", code: "QRIS", disabled: true }
    ]
  },
  "Virtual Account": {
    isDirect: false,
    providers: [
      { name: "Bank BRI (segera hadir)", code: "VA_BRIVA", disabled: true },
      { name: "Bank BNI (segera hadir)", code: "VA_BNI", disabled: true },
    ]
  },
  "E-Wallet": {
    isDirect: false,
    providers: [
      { name: "GoPay (segera hadir)", code: "EWALLET_GOPAY", disabled: true }
    ]
  }
};

// ---------------------------------------------------------------
// -- STATE MANAGEMENT
// ---------------------------------------------------------------
var orderData = {
    items: [],
    kodeKupon: '',
    diskon: 0,
    biayaLayanan: 5000,
    totalPembayaran: 0,
    namaPembeli: '',
    emailPembeli: '',
    metodePembayaran: 'TRANSFER'
};

// ---------------------------------------------------------------
// -- SELEKSI ELEMEN DOM
// ---------------------------------------------------------------
const cartItemsSummary = document.getElementById('cart-items-summary');
const userDetailsStep = document.getElementById('user-details-step');
const tokenVerificationStep = document.getElementById('token-verification-step');
const verificationSuccessMessage = document.getElementById('verification-success-message');
const paymentMethodStep = document.getElementById('payment-method-step');
const fullNameInput = document.getElementById('full_name');
const emailInput = document.getElementById('email');
const sendTokenBtn = document.getElementById('send-token-btn');
const tokenInput = document.getElementById('token');
const verifyTokenBtn = document.getElementById('verify-token-btn');
const tokenFeedback = document.getElementById('token-feedback');
const payNowBtn = document.getElementById('pay-now-btn');
const applyCouponBtn = document.getElementById('apply-coupon-btn');
const couponCodeInput = document.getElementById('coupon_code');
const couponFeedback = document.getElementById('coupon-feedback');
const subtotalEl = document.getElementById('subtotal-amount');
const discountEl = document.getElementById('discount-amount');
const serviceFeeEl = document.getElementById('service-fee');
const totalEl = document.getElementById('total-amount');
const paymentOptionsContainer = document.getElementById('payment-options-container');

// ---------------------------------------------------------------
// -- FUNGSI HELPER
// ---------------------------------------------------------------
const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

// ---------------------------------------------------------------
// -- FUNGSI UTAMA
// ---------------------------------------------------------------
const updateSummary = () => {
    const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = orderData.diskon;
    
    if (discount >= subtotal && subtotal > 0) {
        orderData.biayaLayanan = 0;
    } else {
        orderData.biayaLayanan = parseFloat(serviceFeeEl.getAttribute('data-fee')) || 5000;
    }

    const serviceFee = orderData.biayaLayanan;
    const total = subtotal - discount + serviceFee;
    orderData.totalPembayaran = total < 0 ? 0 : total;

    subtotalEl.textContent = formatCurrency(subtotal);
    discountEl.textContent = `- ${formatCurrency(discount)}`;
    serviceFeeEl.textContent = formatCurrency(serviceFee);
    totalEl.textContent = formatCurrency(orderData.totalPembayaran);

    // Sembunyikan metode pembayaran lain jika gratis
    const transferRadio = document.getElementById('payment-TRANSFER');
    if (orderData.totalPembayaran <= 0 && subtotal > 0) {
        document.querySelectorAll('input[name="payment_method"]').forEach(radio => {
            if (radio.value !== 'TRANSFER') {
                radio.closest('label').classList.add('hidden');
            }
        });
        if(transferRadio) transferRadio.checked = true;
        orderData.metodePembayaran = 'TRANSFER';
        payNowBtn.textContent = 'Klaim & Selesaikan';
    } else {
        payNowBtn.textContent = 'Bayar Sekarang';
    }
};

function renderCartSummary() {
    const cart = getCart(); // Asumsi fungsi ini ada di keranjang.js
    if (cart.length === 0) {
        alert('Keranjang Anda kosong. Anda akan diarahkan kembali.');
        window.location.href = 'view.html';
        return;
    }
    
    orderData.items = cart;
    cartItemsSummary.innerHTML = ''; 

    cart.forEach(item => {
        const itemHTML = `
            <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <img src="${item.image}" alt="${item.name}" class="w-16 h-16 rounded-lg object-cover">
                    <div>
                        <h3 class="font-semibold text-gray-800">${item.name}</h3>
                        <p class="text-sm text-gray-500">${item.id}</p>
                    </div>
                </div>
                <p class="font-semibold text-gray-800">${formatCurrency(item.price * item.quantity)}</p>
            </div>
        `;
        cartItemsSummary.innerHTML += itemHTML;
    });

    updateSummary();
}

function renderPaymentMethods() {
    paymentOptionsContainer.innerHTML = '';
    for (const [groupName, groupDetails] of Object.entries(PAYMENT_METHODS)) {
        let providersHTML = '';
        groupDetails.providers.forEach(provider => {
            const id = `payment-${provider.code}`;
            const isChecked = provider.code === orderData.metodePembayaran ? 'checked' : '';
            const isDisabled = provider.disabled ? 'disabled' : '';
            const labelClasses = provider.disabled ? 'cursor-not-allowed opacity-50' : 'has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50 cursor-pointer';
            
            providersHTML += `
                <label for="${id}" class="flex items-center p-4 border border-gray-300 rounded-lg ${labelClasses}">
                    <input type="radio" id="${id}" name="payment_method" value="${provider.code}" class="h-4 w-4 text-indigo-600" ${isChecked} ${isDisabled}>
                    <span class="ml-3 font-medium text-gray-800">${provider.name}</span>
                </label>
            `;
        });
        if (!groupDetails.isDirect) {
            paymentOptionsContainer.innerHTML += `<div class="border rounded-lg p-4"><p class="font-semibold mb-3">${groupName}</p><div class="space-y-3">${providersHTML}</div></div>`;
        } else {
            paymentOptionsContainer.innerHTML += providersHTML;
        }
    }
    document.querySelectorAll('input[name="payment_method"]').forEach(radio => {
        radio.addEventListener('change', (event) => { orderData.metodePembayaran = event.target.value; });
    });
}

async function handleFinalPayment(event) {
    event.preventDefault();
    
    payNowBtn.disabled = true;
    payNowBtn.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Memproses...`;

    orderData.namaPembeli = fullNameInput.value;
    orderData.emailPembeli = emailInput.value;

    const payload = {
        kontrol: 'proteksi',
        action: 'buatinvoice',
        data: orderData
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (response.ok && result.status === 'sukses' && result.paymentLink) {
            clearCart(); // Asumsi fungsi ini ada di keranjang.js
            window.location.href = result.paymentLink;
        } else {
            alert(result.message || 'Gagal membuat invoice. Silakan coba lagi.');
            payNowBtn.disabled = false;
            payNowBtn.textContent = 'Bayar Sekarang';
        }
    } catch (error) {
        console.error("Gagal memproses pembayaran:", error);
        alert('Terjadi kesalahan. Silakan coba beberapa saat lagi.');
        payNowBtn.disabled = false;
        payNowBtn.textContent = 'Bayar Sekarang';
    }
};

// ---------------------------------------------------------------
// -- EVENT LISTENERS
// ---------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    renderCartSummary();
    renderPaymentMethods();
});

sendTokenBtn.addEventListener('click', async () => {
    if (fullNameInput.value.trim() === '' || emailInput.value.trim() === '') {
        alert('Nama dan Email harus diisi.');
        return;
    }
    sendTokenBtn.disabled = true;
    sendTokenBtn.innerHTML = `Mengirim...`;
    
    const payload = {
        kontrol: 'proteksi',
        action: 'kirimotpbayar',
        email: emailInput.value,
        nama: fullNameInput.value
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (response.ok && (result.status === 'sukses' || result.status === 'success')) {
            userDetailsStep.disabled = true; 
            sendTokenBtn.classList.add('hidden'); 
            tokenVerificationStep.classList.remove('hidden');
            tokenFeedback.textContent = `OTP telah dikirim ke ${emailInput.value}`;
            tokenFeedback.classList.add('text-blue-600');
        } else {
            alert(result.message || 'Gagal mengirim OTP.');
            sendTokenBtn.disabled = false;
            sendTokenBtn.innerHTML = 'Kirim OTP ke Email';
        }
    } catch (error) {
        alert('Terjadi kesalahan jaringan. Periksa koneksi Anda.');
        sendTokenBtn.disabled = false;
        sendTokenBtn.innerHTML = 'Kirim OTP ke Email';
    }
});

verifyTokenBtn.addEventListener('click', async () => {
    if (tokenInput.value.trim() === '') {
        alert('Kode OTP harus diisi.');
        return;
    }
    verifyTokenBtn.disabled = true;
    verifyTokenBtn.innerHTML = 'Memverifikasi...';

    const payload = {
        kontrol: 'proteksi',
        action: 'cekotpbayar',
        email: emailInput.value,
        otp: tokenInput.value
    };
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (response.ok && (result.status === 'sukses' || result.status === 'success')) {
            tokenVerificationStep.classList.add('hidden'); 
            verificationSuccessMessage.classList.remove('hidden'); 
            paymentMethodStep.disabled = false;
            payNowBtn.disabled = false;
        } else {
            tokenFeedback.textContent = result.message || 'OTP salah.';
            tokenFeedback.classList.remove('text-green-600', 'text-blue-600');
            tokenFeedback.classList.add('text-red-500');
            verifyTokenBtn.disabled = false;
            verifyTokenBtn.innerHTML = 'Verifikasi OTP';
        }
    } catch(error) {
        alert('Terjadi kesalahan jaringan saat verifikasi.');
        verifyTokenBtn.disabled = false;
        verifyTokenBtn.innerHTML = 'Verifikasi OTP';
    }
});

applyCouponBtn.addEventListener('click', async () => {
    const code = couponCodeInput.value.trim();
    if (!code) return;

    applyCouponBtn.disabled = true;
    applyCouponBtn.textContent = '...';
    couponFeedback.textContent = '';

    const payload = {
        kontrol: 'proteksi',
        action: 'cekkupon',
        kodeKupon: code
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (response.ok && (result.status === 'sukses' || result.status === 'success')) {
            const coupon = result.data;
            const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            orderData.diskon = (coupon.tipe === 'fixed') ? parseFloat(coupon.nilai) : subtotal * (parseFloat(coupon.nilai) / 100);
            orderData.kodeKupon = code;
            couponFeedback.textContent = `Kupon "${code}" berhasil diterapkan!`;
            couponFeedback.className = 'text-sm mt-2 text-green-600';
        } else {
            throw new Error(result.message || 'Kupon tidak valid.');
        }
    } catch (error) {
        orderData.diskon = 0;
        orderData.kodeKupon = '';
        couponFeedback.textContent = error.message;
        couponFeedback.className = 'text-sm mt-2 text-red-500';
    } finally {
        updateSummary();
        applyCouponBtn.disabled = false;
        applyCouponBtn.textContent = 'Terapkan';
    }
});