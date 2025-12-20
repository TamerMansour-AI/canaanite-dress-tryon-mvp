import fs from 'fs';
import path from 'path';
import { useMemo, useState } from 'react';

export default function Home({ dresses }) {
  const [selectedDress, setSelectedDress] = useState(() => dresses[0]?.id || '');
  const [userImageFile, setUserImageFile] = useState(null);
  const [userImagePreview, setUserImagePreview] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [resultDress, setResultDress] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000',
    []
  );

  const selectedDressDetails = useMemo(
    () => dresses.find((dress) => dress.id === selectedDress) || null,
    [dresses, selectedDress]
  );

  const clearResult = () => {
    setResultImage(null);
    setResultDress(null);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setUserImageFile(null);
      setUserImagePreview(null);
      setUploadError('');
      return;
    }

    const allowedTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
    const maxSize = 5 * 1024 * 1024; // 5MB
    const fileType = (file.type || '').toLowerCase();
    const fileName = (file.name || '').toLowerCase();
    const isHeicOrAvif =
      fileType.includes('heic') ||
      fileType.includes('heif') ||
      fileType.includes('avif') ||
      fileName.endsWith('.heic') ||
      fileName.endsWith('.heif') ||
      fileName.endsWith('.avif');

    if (isHeicOrAvif) {
      setUploadError('HEIC/AVIF detected. Please convert to JPG, JPEG, PNG, or WebP (max 5MB).');
      setUserImageFile(null);
      setUserImagePreview(null);
      clearResult();
      return;
    }

    if (!allowedTypes.has(fileType)) {
      setUploadError('Unsupported file type. Please upload JPG, JPEG, PNG, or WebP.');
      setUserImageFile(null);
      setUserImagePreview(null);
      clearResult();
      return;
    }

    if (file.size > maxSize) {
      setUploadError('File is too large. Please upload an image up to 5MB.');
      setUserImageFile(null);
      setUserImagePreview(null);
      clearResult();
      return;
    }

    setUploadError('');
    clearResult();
    setUserImageFile(file);
    setUserImagePreview(URL.createObjectURL(file));
  };

  const mapErrorCodeToMessage = (code, fallback) => {
    const messages = {
      missing_user_image: 'Please upload a photo to continue.',
      unsupported_input_type: 'Please upload a JPG, JPEG, PNG, or WebP image.',
      file_too_large: 'Images must be 5MB or smaller.',
      invalid_dress_id: 'Selected dress could not be found.',
      invalid_dress_path: 'Selected dress path is invalid.',
      invalid_dress_ext: 'The selected dress file type is not supported.',
      dress_not_found: 'We could not find that dress. Please pick another one.',
      empty_dress_image: 'The selected dress file seems empty.',
      openai_not_configured: 'Real try-on is not available right now. Please check the server setup.',
      no_image: 'The try-on did not return an image. Please try again.',
      openai_error: 'We had trouble generating your try-on. Please try again in a moment.',
    };

    return messages[code] || fallback || 'Something went wrong. Please try again.';
  };

  const handleSubmit = async () => {
    setStatusMessage('');
    setErrorMessage('');

    if (!userImageFile) {
      setErrorMessage('Please upload a photo before generating a try-on.');
      return;
    }

    if (!selectedDressDetails) {
      setErrorMessage('Please select a dress to continue.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Generating… This can take 15–60 seconds.');

    try {
      const formData = new FormData();
      formData.append('userImage', userImageFile);
      formData.append('dressId', selectedDressDetails.id);
      if (selectedDressDetails.src) {
        formData.append('dressSrc', selectedDressDetails.src);
      }
      formData.append('demoOverlay', 'false');
      formData.append('demoMode', 'false');

      const response = await fetch(`${apiBase}/api/tryon`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) {
        const friendly = mapErrorCodeToMessage(
          data?.code,
          data?.error ||
            (response.status === 503
              ? 'Real try-on is temporarily unavailable. Please try again soon.'
              : `Request failed (${response.status}).`)
        );
        setErrorMessage(friendly);
        clearResult();
        return;
      }

      if (!data.image) {
        setErrorMessage('The try-on did not return an image. Please try again.');
        clearResult();
        return;
      }

      setResultImage(data.image);
      setStatusMessage('Try-on ready. You can download the result below.');
      const dressFromResponse =
        dresses.find((dress) => dress.id === data.dressId) || selectedDressDetails;
      setResultDress({
        id: data.dressId || dressFromResponse?.id || '',
        src: data.dressSrc || dressFromResponse?.src || '',
        title: dressFromResponse?.title || 'Selected dress',
        description: dressFromResponse?.description || '',
      });
    } catch (error) {
      const fallback = mapErrorCodeToMessage(null, 'Unable to reach the server. Please try again.');
      setErrorMessage(error?.message || fallback);
      clearResult();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.badge}>Beta</p>
          <h1 style={{ margin: 0 }}>Canaanite Dress Try-On</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#445', maxWidth: 720 }}>
            Upload a photo and choose a reconstructed dress to generate a real AI try-on. This
            store demo uses OpenAI GPT Image 1.5 when configured.
          </p>
        </div>
      </header>

      <section style={styles.layout}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>1. Upload your photo</h2>
          <label style={styles.uploadLabel}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              aria-label="Upload your photo"
            />
            {userImagePreview ? 'Change photo' : 'Choose an image'}
          </label>
          <p style={styles.helperText}>Supported JPG/JPEG/PNG/WebP, max 5MB.</p>
          {uploadError && <p style={styles.errorText}>{uploadError}</p>}
          {userImagePreview && (
            <div style={styles.previewBox}>
              <img
                src={userImagePreview}
                alt="User upload preview"
                style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain' }}
              />
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>2. Pick a dress</h2>
          {dresses.length === 0 ? (
            <p style={{ color: '#556' }}>
              Add dress images to <code>app/public/assets/dresses</code> to see them here.
            </p>
          ) : (
            <div style={styles.dressGrid}>
              {dresses.map((dress) => {
                const isActive = dress.id === selectedDress;
                return (
                  <button
                    key={dress.id}
                    onClick={() => setSelectedDress(dress.id)}
                    style={{
                      ...styles.dressButton,
                      borderColor: isActive ? '#2563eb' : '#d0d7de',
                      boxShadow: isActive ? '0 0 0 3px rgba(37,99,235,0.2)' : 'none',
                    }}
                  >
                    <div style={styles.thumbnailWrap}>
                      <img
                        src={dress.src}
                        alt={dress.title}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700 }}>{dress.title}</p>
                      <p style={{ margin: 0, color: '#556', fontSize: 14 }}>{dress.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>3. Generate</h2>
          <p style={{ margin: '0 0 0.5rem', color: '#556' }}>
            Generate a real AI try-on with your selected dress. This can take a bit of time.
          </p>
          {selectedDressDetails && (
            <div style={styles.selectedDressBox}>
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>Selected dress</p>
                <p style={{ margin: '0.15rem 0 0', color: '#556' }}>{selectedDressDetails.title}</p>
              </div>
              <div style={styles.thumbnailWrapSmall}>
                <img
                  src={selectedDressDetails.src}
                  alt={selectedDressDetails.title}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            </div>
          )}
          <button
            onClick={handleSubmit}
            style={{
              ...styles.generateButton,
              opacity: isSubmitting || !userImageFile || !selectedDressDetails ? 0.75 : 1,
              cursor: isSubmitting || !userImageFile || !selectedDressDetails ? 'not-allowed' : 'pointer',
            }}
            disabled={isSubmitting || !userImageFile || !selectedDressDetails}
            aria-busy={isSubmitting}
          >
            <span style={styles.buttonContent}>
              {isSubmitting && <span style={styles.spinner} aria-hidden="true" />}
              {isSubmitting ? 'Generating…' : 'Generate try-on'}
            </span>
          </button>
          <p style={styles.helperText}>This can take 15–60 seconds.</p>
          {statusMessage && !errorMessage && (
            <p style={styles.statusText}>{statusMessage}</p>
          )}
          {errorMessage && <p style={styles.errorText}>{errorMessage}</p>}
          {resultImage && (
            <div style={{ ...styles.resultGrid, marginTop: '1rem' }}>
              <div style={styles.resultCard}>
                <p style={{ margin: '0 0 0.35rem', fontWeight: 700 }}>Try-on result</p>
                <div style={styles.previewBox}>
                  <img
                    src={resultImage}
                    alt="Try-on result"
                    style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain' }}
                  />
                </div>
                <a
                  href={resultImage}
                  download="try-on.png"
                  style={styles.downloadButton}
                >
                  Download result
                </a>
              </div>
              {resultDress?.src && (
                <div style={styles.previewBox}>
                  <p style={{ margin: '0 0 0.35rem', fontWeight: 700 }}>Selected dress</p>
                  <div style={styles.thumbnailWrap}>
                    <img
                      src={resultDress.src}
                      alt={resultDress.title}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <p style={{ margin: '0.35rem 0 0.15rem', fontWeight: 600 }}>{resultDress.title}</p>
                  {resultDress.id && (
                    <p style={{ margin: 0, color: '#556', fontSize: 14 }}>ID: {resultDress.id}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}

const styles = {
  page: {
    padding: '2rem',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    background: '#f8fafc',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
  },
  badge: {
    display: 'inline-block',
    background: '#e0edff',
    color: '#2563eb',
    padding: '0.15rem 0.5rem',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: 12,
    marginBottom: '0.35rem',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '1rem',
    boxShadow: '0 10px 30px rgba(17,24,39,0.05)',
  },
  cardTitle: {
    margin: '0 0 0.75rem',
  },
  uploadLabel: {
    display: 'inline-block',
    padding: '0.75rem 1rem',
    borderRadius: 10,
    border: '1px dashed #94a3b8',
    background: '#f1f5f9',
    cursor: 'pointer',
    fontWeight: 600,
  },
  previewBox: {
    marginTop: '0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '0.75rem',
    background: '#f8fafc',
    textAlign: 'center',
  },
  helperText: {
    margin: '0.35rem 0 0',
    color: '#64748b',
    fontSize: 14,
  },
  errorText: {
    margin: '0.5rem 0 0',
    color: '#b91c1c',
    fontWeight: 600,
  },
  statusText: {
    margin: '0.75rem 0 0',
    color: '#0f172a',
    fontWeight: 600,
  },
  dressGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.75rem',
  },
  dressButton: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #d0d7de',
    borderRadius: 12,
    background: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
  },
  thumbnailWrap: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  thumbnailWrapSmall: {
    width: 96,
    height: 96,
    borderRadius: 10,
    overflow: 'hidden',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  generateButton: {
    padding: '0.85rem 1.25rem',
    borderRadius: 10,
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  spinner: {
    width: 16,
    height: 16,
    border: '2px solid rgba(255,255,255,0.6)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  selectedDressBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '0.75rem',
    marginBottom: '0.75rem',
    background: '#f8fafc',
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '0.75rem',
  },
  resultCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '0.75rem',
    boxShadow: '0 10px 25px rgba(15,23,42,0.08)',
  },
  downloadButton: {
    display: 'inline-block',
    marginTop: '0.75rem',
    padding: '0.65rem 0.9rem',
    background: '#0f172a',
    color: '#fff',
    borderRadius: 10,
    textDecoration: 'none',
    fontWeight: 700,
  },
};

function humanizeFilename(id) {
  const spaced = id
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function getStaticProps() {
  const dressesDir = path.join(process.cwd(), 'public', 'assets', 'dresses');
  const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
  let dresses = [];

  try {
    const files = await fs.promises.readdir(dressesDir, { withFileTypes: true });
    dresses = files
      .filter((file) => file.isFile())
      .map((file) => file.name)
      .filter((name) => {
        if (name.startsWith('.')) return false;
        const ext = path.extname(name).toLowerCase();
        return allowedExtensions.has(ext);
      })
      .map((filename) => {
        const ext = path.extname(filename);
        const id = path.basename(filename, ext);
        const title = humanizeFilename(id);
        return {
          id,
          title,
          description: `Reconstructed dress: ${title}`,
          src: `/assets/dresses/${filename}`,
        };
      });
  } catch (error) {
    console.error('Error loading dresses from public/assets/dresses', error);
  }

  return {
    props: {
      dresses,
    },
  };
}
