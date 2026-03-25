const PIN_KEY = 'levelup_pin_v1';
const BIOMETRIC_KEY = 'levelup_biometric_v1';

export async function savePin(pin) {
  localStorage.setItem(PIN_KEY, pin);
}

export function getPin() {
  return localStorage.getItem(PIN_KEY) || '';
}

export async function setBiometricEnabled(enabled) {
  localStorage.setItem(BIOMETRIC_KEY, enabled ? '1' : '0');
}

export function isBiometricEnabled() {
  return localStorage.getItem(BIOMETRIC_KEY) === '1';
}
