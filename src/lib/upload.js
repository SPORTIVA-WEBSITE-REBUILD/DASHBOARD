import { api } from './api.js';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024;

export function validateFile(file) {
  if (!ALLOWED.includes(file.type)) {
    return `${file.name}: only JPEG, PNG, WebP, AVIF and PDF files can be uploaded`;
  }
  if (file.size > MAX_BYTES) {
    return `${file.name}: files must be 10 MB or smaller`;
  }
  return null;
}

/**
 * Uploads straight from the browser to Cloudinary using a signature the API
 * mints. The file never travels through our own server, which keeps the
 * serverless function fast and well inside its request size limits.
 *
 * XMLHttpRequest rather than fetch, because fetch still cannot report upload
 * progress and a 10 MB upload with no feedback feels broken.
 */
export function uploadFile(file, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    api.post('/media/sign')
      .then(({ data: sig }) => {
        const form = new FormData();
        form.append('file', file);
        form.append('api_key', sig.apiKey);
        form.append('timestamp', sig.timestamp);
        form.append('signature', sig.signature);
        form.append('folder', sig.folder);
        form.append('allowed_formats', sig.allowed_formats);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = async () => {
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error('The upload was rejected by the media service'));
            return;
          }
          const result = JSON.parse(xhr.responseText);
          try {
            // Persist the metadata; the API validates it belongs to our cloud.
            const saved = await api.post('/media', {
              publicId: result.public_id,
              url: result.url,
              secureUrl: result.secure_url,
              format: result.format,
              resourceType: result.resource_type,
              width: result.width,
              height: result.height,
              bytes: result.bytes,
              folder: sig.folder,
              alt: '',
            });
            resolve(saved.data);
          } catch (err) {
            reject(err);
          }
        };

        xhr.onerror = () => reject(new Error('The upload failed. Please check your connection.'));
        xhr.send(form);
      })
      .catch(reject);
  });
}

/** Thumbnail and preview URLs, transformed on Cloudinary's CDN. */
export function thumb(media, width = 300, height = 220) {
  const src = media?.secureUrl;
  if (!src || !src.includes('/upload/')) return src || '';
  return src.replace('/upload/', `/upload/f_auto,q_auto,c_fill,w_${width},h_${height}/`);
}

export function preview(media, width = 600) {
  const src = media?.secureUrl;
  if (!src || !src.includes('/upload/')) return src || '';
  return src.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
}
