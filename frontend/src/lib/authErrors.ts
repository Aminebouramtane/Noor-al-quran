export function getFirebaseAuthErrorMessage(error: unknown): string {
  const fallback = 'فشل في المصادقة. حاول مرة أخرى.';

  if (!error || typeof error !== 'object') return fallback;

  const e = error as { code?: string; message?: string };
  const code = e.code || e.message || '';

  if (code.includes('auth/configuration-not-found') || code.includes('CONFIGURATION_NOT_FOUND')) {
    return 'إعدادات Firebase Authentication غير مفعّلة. فعّل Email/Password من Firebase Console ثم أعد المحاولة.';
  }

  if (code.includes('auth/invalid-api-key')) {
    return 'مفتاح Firebase API غير صحيح.';
  }

  if (code.includes('auth/email-already-in-use')) {
    return 'هذا البريد مستخدم بالفعل.';
  }

  if (code.includes('auth/popup-closed-by-user')) {
    return 'تم إغلاق نافذة تسجيل الدخول قبل إكمال العملية.';
  }

  if (code.includes('auth/cancelled-popup-request')) {
    return 'تم إلغاء طلب تسجيل الدخول.';
  }

  if (code.includes('auth/account-exists-with-different-credential')) {
    return 'هذا البريد مرتبط بطريقة تسجيل دخول أخرى. جرّب طريقة مختلفة.';
  }

  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password') || code.includes('auth/user-not-found')) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  }

  if (code.includes('auth/network-request-failed')) {
    return 'مشكلة في الشبكة. تحقق من الاتصال وحاول مرة أخرى.';
  }

  return e.message || fallback;
}
