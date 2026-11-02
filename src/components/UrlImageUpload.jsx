import { useRef, useState } from 'react';
import { uploadFile, validateFile } from '../lib/upload.js';
import { useToast } from './ui.jsx';

/**
 * A single-image uploader that stores the resulting Cloudinary secureUrl as
 * a plain string, not a Media _id reference the way MediaPicker does.
 *
 * The Webinar schema stores bannerUrl/shareImageUrl/speaker.photoUrl as
 * plain URLs rather than Media refs — on purpose, since the public API
 * (GET /api/webinar) serves this document directly with no populate step,
 * and a plain string needs none. Reusing the same signed-upload flow
 * (lib/upload.js) as every other upload in the dashboard; only what gets
 * stored afterwards differs.
 */
export default function UrlImageUpload({ label, value, onChange, hint }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const toast = useToast();

  async function handleFile(file) {
    if (!file) return;
    const problem = validateFile(file);
    if (problem) { toast.error(problem); return; }
    try {
      setProgress(0);
      const media = await uploadFile(file, { onProgress: setProgress });
      onChange(media.secureUrl);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="field">
      {label && <label>{label}</label>}
      <div className="image-picker">
        {value
          ? <img className="image-picker__preview" src={value} alt="" />
          : <div className="image-picker__preview" aria-hidden="true" />}
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {value && (
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => onChange('')}>
              Remove
            </button>
          )}
          {hint && <p className="hint mt-1">{hint}</p>}
        </div>
      </div>
      {progress !== null && (
        <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress__bar" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
