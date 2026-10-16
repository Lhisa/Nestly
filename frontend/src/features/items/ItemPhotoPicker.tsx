import { useEffect, useState } from 'react';

export function validateItemPhoto(file: File): string {
  if (file.size > 10_000_000) return 'La fotografia ha de tenir com a màxim 10.000.000 bytes.';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Selecciona una fotografia JPEG, PNG o WebP. HEIC/HEIF encara no està disponible.';
  return '';
}

export function ItemPhotoPicker({ photo, error, disabled, onChange, onError, sharedWithProduct = false }: {
  photo: File | null; error: string; disabled: boolean; sharedWithProduct?: boolean;
  onChange: (photo: File | null) => void; onError: (message: string) => void;
}) {
  const [preview, setPreview] = useState('');
  useEffect(() => {
    if (!photo) { setPreview(''); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  return <section className="form-block photo-form-block" aria-labelledby="photo-heading">
    <header><span className="editorial-number" aria-hidden="true">03</span><div><h2 id="photo-heading">Una fotografia, si vols</h2><p>{sharedWithProduct ? 'La fotografia és compartida per totes les unitats del producte.' : 'Les unitats d’aquest registre compartiran la mateixa fotografia.'}</p></div></header>
    <label htmlFor="item-photo">Fotografia (opcional)</label>
    <input id="item-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled}
      aria-invalid={!!error} aria-describedby="photo-help photo-error"
      onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        const message = validateItemPhoto(file);
        onError(message);
        if (!message) onChange(file);
      }} />
    <p id="photo-help">JPEG, PNG o WebP. Màxim 10.000.000 bytes. HEIC/HEIF encara no està disponible.</p>
    {preview && <div className="photo-preview"><img src={preview} alt="Previsualització de la fotografia seleccionada" /><p>{photo?.name}</p></div>}
    {(photo || error) && <button type="button" disabled={disabled} onClick={() => { onChange(null); onError(''); }}>Retirar fotografia</button>}
    {photo && <p className="photo-replace-help">Per substituir-la, selecciona un altre fitxer.</p>}
    {error && <p id="photo-error" className="field-error" role="alert">{error}</p>}
  </section>;
}
