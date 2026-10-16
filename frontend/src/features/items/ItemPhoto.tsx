import { useState } from 'react';

export function itemPhotoUrl(reference: string | null | undefined): string | null {
  const match = /^items[/]([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})[.]webp$/.exec(reference ?? '');
  return match ? '/api/item-photos/' + match[1] : null;
}

export function ItemPhoto({ reference, name }: { reference: string | null | undefined; name: string }) {
  const url = itemPhotoUrl(reference);
  const [failedUrl, setFailedUrl] = useState('');
  const unavailable = !url || failedUrl === url;
  return <div className="item-photo-frame">
    {unavailable ? <div className="item-photo-placeholder">
      <svg viewBox="0 0 160 120" fill="none" aria-hidden="true" focusable="false">
        <ellipse cx="80" cy="96" rx="46" ry="7" className="photo-placeholder-shadow" />
        <path d="M43 42c12-5 27-7 40-5l32 9-8 41c-13 6-28 7-42 3l-30-8 8-40Z" className="photo-placeholder-cloth" />
        <path d="m43 42 31 10c13 3 27 1 41-6M74 52l-9 38M46 69l17 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p>{url ? 'Fotografia no disponible' : 'Sense fotografia'}</p>
    </div> : <img className="item-photo" src={url} alt={'Fotografia de ' + name} loading="lazy" onError={() => setFailedUrl(url)} />}
  </div>;
}
