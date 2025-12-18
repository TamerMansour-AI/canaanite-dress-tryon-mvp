import { useMemo, useState } from 'react';

const dressOptions = [
  {
    id: 'linen-blue',
    name: 'Sky Linen',
    description: 'Soft linen drape with a calming blue palette.',
    image: '/assets/dresses/linen-blue.svg',
  },
  {
    id: 'ceremonial-gold',
    name: 'Ceremonial Gold',
    description: 'Gold embroidered ceremonial wrap.',
    image: '/assets/dresses/ceremonial-gold.svg',
  },
  {
    id: 'crimson-festival',
    name: 'Crimson Festival',
    description: 'Festive crimson layers inspired by seasonal gatherings.',
    image: '/assets/dresses/crimson-festival.svg',
  },
];

export default function Home() {
  const [selectedDress, setSelectedDress] = useState(dressOptions[0].id);
  const [userImageFile, setUserImageFile] = useState(null);
  const [userImagePreview, setUserImagePreview] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000',
    []
  );

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setUserImageFile(null);
      setUserImagePreview(null);
      return;
    }

    setUserImageFile(file);
    setUserImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!userImageFile) {
      setStatusMessage('Please upload a photo before generating a try-on.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('');

    try {
      const formData = new FormData();
      formData.append('userImage', userImageFile);
      formData.append('dressId', selectedDress);

      const response = await fetch(`${apiBase}/api/tryon`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Unable to reach the demo API');
      }

      const data = await response.json();
      setResultImage(data.image || null);
      setStatusMessage(data.status || 'Demo mode');
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.badge}>Demo</p>
          <h1 style={{ margin: 0 }}>Canaanite Dress Try-On</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#445', maxWidth: 640 }}>
            Upload a photo, choose a reconstructed dress, and generate a demo try-on.
            This demo echoes back your upload while the AI pipeline is in progress.
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
            />
            {userImagePreview ? 'Change photo' : 'Choose an image'}
          </label>
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
          <div style={styles.dressGrid}>
            {dressOptions.map((dress) => {
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
                  <img
                    src={dress.image}
                    alt={dress.name}
                    style={{ width: '100%', height: 140, objectFit: 'contain' }}
                  />
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700 }}>{dress.name}</p>
                    <p style={{ margin: 0, color: '#556', fontSize: 14 }}>{dress.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>3. Generate</h2>
          <p style={{ margin: '0 0 0.5rem', color: '#556' }}>
            The demo sends your photo to the backend and returns it unchanged with a status message.
          </p>
          <button
            onClick={handleSubmit}
            style={styles.generateButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Generating…' : 'Generate demo'}
          </button>
          {statusMessage && (
            <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>{statusMessage}</p>
          )}
          {resultImage && (
            <div style={{ ...styles.previewBox, marginTop: '1rem' }}>
              <img
                src={resultImage}
                alt="Demo try-on result"
                style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain' }}
              />
            </div>
          )}
        </div>
      </section>
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
  generateButton: {
    padding: '0.85rem 1.25rem',
    borderRadius: 10,
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
  },
};
