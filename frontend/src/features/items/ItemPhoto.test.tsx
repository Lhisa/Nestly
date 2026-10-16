// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemPhotoPicker, validateItemPhoto } from './ItemPhotoPicker';
import { ItemPhoto, itemPhotoUrl } from './ItemPhoto';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function setup() {
  let index = 0;
  const create = vi.fn(() => 'blob:preview-' + ++index);
  const revoke = vi.fn();
  const OriginalURL = URL;
  vi.stubGlobal('URL', class extends OriginalURL { static createObjectURL = create; static revokeObjectURL = revoke; });
  function Picker() {
    const [photo, setPhoto] = useState<File | null>(null);
    const [error, setError] = useState('');
    return <ItemPhotoPicker photo={photo} error={error} disabled={false} onChange={setPhoto} onError={setError} />;
  }
  const view = render(<Picker />);
  return { ...view, user: userEvent.setup(), create, revoke };
}
test('preview, replacement, removal and unmount release temporary URLs', async () => {
  const { user, create, revoke, unmount } = setup();
  const input = screen.getByLabelText('Fotografia (opcional)');
  await user.upload(input, new File(['a'], 'first.png', { type: 'image/png' }));
  expect(screen.getByRole('img').getAttribute('src')).toBe('blob:preview-1');
  await user.upload(input, new File(['b'], 'second.webp', { type: 'image/webp' }));
  expect(screen.getByText('second.webp')).toBeTruthy();
  expect(revoke).toHaveBeenCalledWith('blob:preview-1');
  await user.click(screen.getByRole('button', { name: 'Retirar fotografia' }));
  expect(screen.queryByRole('img')).toBeNull();
  expect(revoke).toHaveBeenCalledWith('blob:preview-2');
  await user.upload(input, new File(['c'], 'last.jpg', { type: 'image/jpeg' }));
  unmount();
  expect(create).toHaveBeenCalledTimes(3);
  expect(revoke).toHaveBeenCalledWith('blob:preview-3');
});
test.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s within byte boundary', type => {
  const file = new File(['x'], 'photo', { type });
  Object.defineProperty(file, 'size', { value: 10_000_000 });
  expect(validateItemPhoto(file)).toBe('');
});
test('rejects too many bytes and unsupported MIME including HEIC', async () => {
  const large = new File(['x'], 'large.png', { type: 'image/png' });
  Object.defineProperty(large, 'size', { value: 10_000_001 });
  expect(validateItemPhoto(large)).toContain('10.000.000');
  expect(validateItemPhoto(new File(['x'], 'phone.heic', { type: 'image/heic' }))).toContain('HEIC/HEIF');
  setup();
  fireEvent.change(screen.getByLabelText('Fotografia (opcional)'), { target: { files: [large] } });
  expect(screen.getByRole('alert').textContent).toContain('10.000.000');
  expect(screen.queryByRole('img')).toBeNull();
});
test('constructs only safe same-origin URLs', () => {
  expect(itemPhotoUrl('items/12345678-1234-4123-8123-123456789abc.webp')).toBe('/api/item-photos/12345678-1234-4123-8123-123456789abc');
  for (const ref of [null, '../x.webp', 'https://evil.test/x', 'items/../../x', 'items/12345678-1234-4123-8123-123456789abc.webp?x=1']) expect(itemPhotoUrl(ref)).toBeNull();
});
test('neutral state and unavailable images do not expose unsafe paths', () => {
  const { rerender } = render(<ItemPhoto reference={null} name="Body" />);
  expect(screen.getByText('Sense fotografia')).toBeTruthy();
  rerender(<ItemPhoto reference="items/12345678-1234-4123-8123-123456789abc.webp" name="Body" />);
  fireEvent.error(screen.getByRole('img', { name: 'Fotografia de Body' }));
  expect(screen.getByText('Fotografia no disponible')).toBeTruthy();
});
