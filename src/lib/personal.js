const KEY = 'job-atlas-personal-v1';

export function readPersonal() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function savePersonal(value) {
  localStorage.setItem(KEY, JSON.stringify(value));
}
