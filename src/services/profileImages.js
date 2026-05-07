import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from './firebase.js';

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

export async function uploadProfileImage(user, file) {
  if (!storage) throw new Error('Firebase Storage is not configured.');
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
  const imageRef = ref(storage, `profile-images/${uid}/${Date.now()}.${ext}`);
  const snapshot = await uploadBytes(imageRef, file, {
    contentType: file.type || 'image/jpeg',
    customMetadata: {
      owner: uid,
    },
  });
  return getDownloadURL(snapshot.ref);
}
