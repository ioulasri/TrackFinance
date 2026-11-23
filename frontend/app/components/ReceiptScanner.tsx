import React, { useEffect, useRef, useState } from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { C, PrimaryButton, GhostButton } from './ds';
import { receiptAPI, transactionAPI } from '../api';
import { useCurrency } from '../currency';

/** Compress camera photos before upload to stay within serverless request limits. */
export async function prepareReceipt(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a JPG, PNG or WebP receipt photo.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose a receipt photo smaller than 25 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser could not read the photo. Try another image.');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not read the image.')), 'image/jpeg', 0.88));
    if (blob.size > 4 * 1024 * 1024) throw new Error('This photo is still too large. Crop the receipt and try again.');
    return new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
  } finally { URL.revokeObjectURL(url); }
}
const inputStyle = { width: '100%', border: `1px solid ${C.border}`, padding: 10, borderRadius: 8, fontSize: 16 };

export function ReceiptScanner({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { currency } = useCurrency();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<any>(null);
  const [preview, setPreview] = useState('');
  const [converted, setConverted] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const operation = useRef(0);
  const saving = useRef(false);
  useEffect(() => { if (!isOpen) { operation.current++; setDraft(null); setError(''); setBusy(false); setPreview(''); setConverted(false); } }, [isOpen]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { setConverted(false); }, [currency]);
  const scan = async (file?: File) => {
    if (!file || busy) return;
    const id = ++operation.current;
    setBusy(true); setError(''); setDraft(null); setConverted(false);
    try {
      const image = await prepareReceipt(file);
      if (id !== operation.current) return;
      setPreview(URL.createObjectURL(image));
      const result = await receiptAPI.scan(image);
      if (id !== operation.current) return;
      setDraft({ ...result, amount: String(result.amount), date: result.date || new Date().toISOString().slice(0, 10) });
    } catch (err: any) {
      if (id === operation.current) setError(err.response?.data?.detail || err.message || 'Could not read this receipt. Try a clearer photo.');
    } finally { if (id === operation.current) setBusy(false); }
  };
  const mismatch = draft?.currency && draft.currency !== currency;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving.current || !draft || (mismatch && !converted)) return;
    saving.current = true; setBusy(true); setError('');
    try {
      await transactionAPI.create({ amount: Number(draft.amount), type: 'expense', category: draft.category, description: draft.description, date: `${draft.date}T12:00:00` });
      window.dispatchEvent(new Event('tf:data-updated'));
      onClose();
    } catch (err: any) { setError(err.response?.data?.detail || 'Could not save the expense. Please try again.'); }
    finally { saving.current = false; setBusy(false); }
  };
  return <Modal isOpen={isOpen} onClose={() => { if (!saving.current) onClose(); }} title="Scan a receipt">
    <p className="text-sm text-muted-foreground mb-4">Take a photo or upload a receipt. Review the details before saving an expense.</p>
    <div className="flex flex-wrap gap-3 mb-4">
      <GhostButton disabled={busy} onClick={() => cameraRef.current?.click()}><Camera size={18} /> Take photo</GhostButton>
      <GhostButton disabled={busy} onClick={() => uploadRef.current?.click()}><Upload size={18} /> Upload receipt</GhostButton>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Take receipt photo" onChange={e => { scan(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Upload receipt image" onChange={e => { scan(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
    {busy && <p role="status" className="flex items-center gap-2 text-sm mb-4"><Loader2 size={18} className="animate-spin" />{saving.current ? 'Saving expense…' : 'Reading receipt…'}</p>}
    {error && <p role="alert" className="text-sm text-destructive mb-4">{typeof error === 'string' ? error : 'Please check the receipt fields and try again.'}</p>}
    {preview && <img src={preview} alt="Receipt to review" className="max-h-48 max-w-full mx-auto mb-4 rounded-lg object-contain" />}
    {draft && <form onSubmit={save} className="space-y-4">
      <p className="text-sm text-muted-foreground">{draft.confidence === 'low' ? 'Some details were unclear. Check every field.' : 'Check the extracted total, merchant, category and date.'}</p>
      {mismatch && <div role="alert" className="p-3 rounded-lg bg-amber-50 text-sm text-amber-900">This receipt is in {draft.currency}; your account uses {currency}. Enter the converted total below. Amounts are not converted automatically.
        <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={converted} onChange={e => setConverted(e.target.checked)} />I have entered the total in {currency}.</label>
      </div>}
      <label className="block text-sm">Amount ({currency})<input aria-label={`Receipt amount (${currency})`} style={inputStyle} type="number" inputMode="decimal" step="0.01" min="0.01" required value={draft.amount} onChange={e => { setDraft({ ...draft, amount: e.target.value }); if (mismatch) setConverted(false); }} /></label>
      <label className="block text-sm">Merchant / description<input style={inputStyle} maxLength={255} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
      <label className="block text-sm">Category<input style={inputStyle} required maxLength={50} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} /></label>
      <label className="block text-sm">Date<input style={inputStyle} required type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></label>
      <div className="flex justify-end gap-3"><GhostButton disabled={busy} onClick={onClose}>Cancel</GhostButton><PrimaryButton type="submit" disabled={busy || (mismatch && !converted)}>Save expense</PrimaryButton></div>
    </form>}
  </Modal>;
}
