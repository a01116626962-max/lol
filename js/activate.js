// ============================================================
// 🎫 نظام تفعيل الترخيص - واجهة العميل
// ============================================================

async function activateCode() {
    const codeInput = document.getElementById('code-input');
    const activateBtn = document.getElementById('activate-btn');
    const loadingElement = document.getElementById('loading');
    const successBox = document.getElementById('success-box');
    const errorBox = document.getElementById('error-box');

    // إخفاء النتائج السابقة
    successBox.style.display = 'none';
    errorBox.style.display = 'none';

    // الحصول على الكود وتنظيفه
    const code = codeInput.value.trim();
    
    // رابط السيرفر الموحد الخاص بك على Vercel
    const apiBaseUrl = "https://abogad.vercel.app";

    // التحقق من المدخلات
    if (!code) {
        showError('❌ يرجى إدخال كود التفعيل');
        codeInput.focus();
        return;
    }

    // تحويل الكود للحروف الكبيرة
    const cleanCode = code.toUpperCase();
    codeInput.value = cleanCode;

    try {
        // إظهار مؤشر التحميل
        loadingElement.style.display = 'block';
        activateBtn.disabled = true;

        console.log('📤 إرسال طلب إلى:', `${apiBaseUrl}/api/codes/activate`);

        // إرسال الطلب إلى الخادم الموحد
        const response = await fetch(`${apiBaseUrl}/api/codes/activate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: cleanCode
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'فشل تفعيل الكود');
        }

        // نجاح التفعيل
        console.log('✅ تم التفعيل بنجاح:', data);
        showSuccess(data.message, data.details);

        // تفريغ حقل الإدخال بعد النجاح
        codeInput.value = '';

    } catch (error) {
        console.error('❌ خطأ:', error);
        showError(error.message || 'حدث خطأ أثناء التفعيل');
    } finally {
        // إخفاء مؤشر التحميل
        loadingElement.style.display = 'none';
        activateBtn.disabled = false;
    }
}

// عرض رسالة النجاح
function showSuccess(message, details) {
    const successBox = document.getElementById('success-box');
    const successMessage = document.getElementById('success-message');
    const successDetails = document.getElementById('success-details');

    successMessage.textContent = message;
    
    if (details) {
        successDetails.innerHTML = `
            📅 عدد الأيام المضافة: ${details.days_added || 'غير محدد'}<br>
            📧 الحساب المستفيد: ${details.client_email || 'غير محدد'}
        `;
    }

    successBox.style.display = 'block';
}

// عرض رسالة الخطأ
function showError(message) {
    const errorBox = document.getElementById('error-box');
    const errorMessage = document.getElementById('error-message');

    errorMessage.textContent = message;
    errorBox.style.display = 'block';
}

// تفعيل عند الضغط على Enter
document.getElementById('code-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        activateCode();
    }
});

// تنسيق الكود تلقائياً بإضافة شرطة (-) كل 4 حروف أثناء الكتابة
document.getElementById('code-input').addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    if (value.length > 4) value = value.slice(0, 4) + '-' + value.slice(4);
    if (value.length > 9) value = value.slice(0, 9) + '-' + value.slice(9);
    if (value.length > 14) value = value.slice(0, 14) + '-' + value.slice(14);
    
    e.target.value = value.substring(0, 19);
});
