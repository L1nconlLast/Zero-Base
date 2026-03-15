export const STRONG_PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export interface PasswordChecks {
  minLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export const getPasswordChecks = (password: string): PasswordChecks => ({
  minLength: password.length >= 8,
  hasUppercase: /[A-Z]/.test(password),
  hasNumber: /\d/.test(password),
  hasSpecialChar: /[^A-Za-z0-9]/.test(password),
});

export const validateStrongPassword = (password: string): { valid: boolean; message: string } => {
  const checks = getPasswordChecks(password);
  const isValid = Object.values(checks).every(Boolean);

  if (isValid && STRONG_PASSWORD_REGEX.test(password)) {
    return { valid: true, message: '' };
  }

  return {
    valid: false,
    message: 'A senha deve ter no mínimo 8 caracteres, incluindo 1 letra maiúscula, 1 número e 1 símbolo.',
  };
};
