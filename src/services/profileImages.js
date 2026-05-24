import levelupApi from './levelupApi.js';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function extensionFor(file) {
  const name = `${file?.name || ''}`.trim().toLowerCase();
  const fromName = name.match(/\.([a-z0-9]+)$/)?.[1];
  if (fromName) return fromName;
  const type = `${file?.type || ''}`.toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  return 'jpg';
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(`${reader.result || ''}`);
    reader.onerror = () => reject(reader.error || new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

export async function uploadProfileImage(user, file) {
  const uid = `${user?.uid || ''}`.trim();
  if (!uid) throw new Error('Sign in before changing your profile photo.');
  if (!file) throw new Error('Choose a profile photo first.');
  if (!`${file.type || ''}`.startsWith('image/')) {
    throw new Error('Choose an image file.');
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Profile photo must be 5MB or smaller.');
  }

  const ext = extensionFor(file);
  const data = await fileToDataUrl(file);
  const response = await levelupApi.uploadBase64({
    filename: `profile-${uid}-${Date.now()}.${ext}`,
    contentType: file.type || 'image/jpeg',
    data,
  });
  const url = `${response.url || ''}`.trim();
  if (!url) throw new Error('Upload failed.');
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return url;
  return `${levelupApi.baseUrl}${url}`;
}
