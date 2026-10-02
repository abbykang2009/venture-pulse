import { useState } from 'react';
import { PlusCircle, Pencil, X, Loader2, Image as ImageIcon, Play } from 'lucide-react';
import {
  STAGES, ORIGINS, LOCATIONS, CURRENCIES, ADMIN_TAGS, ADMIN_TAG_LABELS,
  MAX_MEDIA, MAX_IMAGE_MB, MAX_VIDEO_MB, ALLOWED_TYPES,
} from '../constants';
import type { CircleSummary, Deal } from '../types';

/** Shrinks big phone photos (and strips location data from them) before upload. */
async function prepareUpload(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** A slot in the media grid: either a photo/video already saved on the server, or a new local file to upload. */
type MediaSlot =
  | { kind: 'existing'; key: string; url: string; mediaKind: 'image' | 'video' }
  | { kind: 'new'; file: File; previewUrl: string };

function slotsFromExistingDeal(deal?: Deal): MediaSlot[] {
  const media = deal?.media ?? (deal?.cover ? [deal.cover] : []);
  const slots: MediaSlot[] = [];
  for (const m of media) {
    if (!m.url.startsWith('/api/image/')) continue; // legacy items with no real media key can't be kept on edit
    const key = m.url.slice('/api/image/'.length);
    if (!/^[0-9a-f-]{36}\.[a-z0-9]{3,4}$/.test(key)) continue;
    slots.push({ kind: 'existing', key, url: m.url, mediaKind: m.kind });
  }
  return slots;
}

export default function CreateDealModal({
  isAdminMode,
  myCircles,
  defaultCircleId,
  editDeal,
  onClose,
  onUnauthorized,
  onCreated,
}: {
  isAdminMode: boolean;
  myCircles: CircleSummary[];
  defaultCircleId?: string;
  editDeal?: Deal;
  onClose: () => void;
  onUnauthorized: () => void;
  onCreated: () => void;
}) {
  const isEditing = !!editDeal;

  const [name, setName] = useState(editDeal?.name || '');
  const [stage, setStage] = useState(editDeal?.stage || '');
  const [budget, setBudget] = useState(editDeal?.budget != null ? String(editDeal.budget) : '');
  const [currency, setCurrency] = useState(editDeal?.currency || '');
  const [origin, setOrigin] = useState(editDeal?.origin || '');
  const [currentLocation, setCurrentLocation] = useState(editDeal?.location || '');
  const [description, setDescription] = useState(editDeal?.description || '');
  const [listingType, setListingType] = useState<'Business' | 'VC'>(editDeal?.tag === 'VC' ? 'VC' : 'Business');
  const [postToCircle, setPostToCircle] = useState(!!defaultCircleId || !!editDeal?.circleId);
  const [circleId, setCircleId] = useState(defaultCircleId || editDeal?.circleId || myCircles[0]?.id || '');
  const [alsoGlobal, setAlsoGlobal] = useState(editDeal?.alsoGlobal ?? false);
  const [contactInfo, setContactInfo] = useState(editDeal?.contact?.info || '');
  const [socialLink, setSocialLink] = useState(editDeal?.contact?.social || '');
  const [contactPublic, setContactPublic] = useState(editDeal?.contact?.public ?? false);
  const [slots, setSlots] = useState<MediaSlot[]>(() => slotsFromExistingDeal(editDeal));
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const addMediaFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setCreateError(null);
    const room = MAX_MEDIA - slots.length;
    const added: MediaSlot[] = [];
    let problem: string | null = null;

    for (const file of Array.from(fileList)) {
      if (added.length >= room) {
        problem = `You can add up to ${MAX_MEDIA} photos/videos.`;
        break;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        problem = `"${file.name}" isn't supported. Use JPG, PNG, WEBP, GIF, MP4, WEBM or MOV.`;
        continue;
      }
      if (file.type.startsWith('video/') && file.size > MAX_VIDEO_MB * 1024 * 1024) {
        problem = `"${file.name}" is too big. Videos must be under ${MAX_VIDEO_MB} MB.`;
        continue;
      }
      added.push({ kind: 'new', file, previewUrl: URL.createObjectURL(file) });
    }
    if (added.length) setSlots((prev) => [...prev, ...added]);
    if (problem) setCreateError(problem);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => {
      const slot = prev[index];
      if (slot.kind === 'new') URL.revokeObjectURL(slot.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !stage || !origin || !currentLocation || !currency || budget === '') return;
    if (!isEditing && postToCircle && !circleId) {
      setCreateError('Choose which circle to post to.');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);
    try {
      const mediaKeys: string[] = [];
      const newSlots = slots.filter((s): s is Extract<MediaSlot, { kind: 'new' }> => s.kind === 'new');
      let uploaded = 0;
      for (const slot of slots) {
        if (slot.kind === 'existing') {
          mediaKeys.push(slot.key);
          continue;
        }
        uploaded += 1;
        setUploadProgress(`Uploading ${uploaded} of ${newSlots.length}...`);
        const original = slot.file;
        const blob = await prepareUpload(original);
        const isVideo = blob.type.startsWith('video/');
        const limitMb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
        if (blob.size > limitMb * 1024 * 1024) {
          throw new Error(`"${original.name}" is too big. ${isVideo ? 'Videos' : 'Photos'} must be under ${limitMb} MB.`);
        }
        const up = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
        if (up.status === 401) return onUnauthorized();
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(upData.error || `Could not upload "${original.name}".`);
        mediaKeys.push(upData.key);
      }

      setUploadProgress(isEditing ? 'Saving changes...' : 'Publishing...');
      const payload: Record<string, unknown> = {
        name: name.trim(),
        stage,
        origin,
        location: currentLocation,
        budget: Number(budget),
        currency,
        description: description.trim(),
        mediaKeys,
        contactInfo: contactInfo.trim(),
        socialLink: socialLink.trim(),
        contactPublic,
        ...(isAdminMode ? { listingType } : {}),
      };
      if (!isEditing) {
        payload.circleId = postToCircle && circleId ? circleId : undefined;
      }
      if (!isEditing ? postToCircle : !!editDeal?.circleId) {
        payload.alsoGlobal = alsoGlobal;
      }

      const res = await fetch(isEditing ? `/api/deals?id=${editDeal!.id}` : '/api/deals', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) return onUnauthorized();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCreateError(data.error || `Could not ${isEditing ? 'save changes to' : 'publish'} this listing.`);
      } else {
        slots.forEach((s) => { if (s.kind === 'new') URL.revokeObjectURL(s.previewUrl); });
        onCreated();
      }
    } catch (error: any) {
      console.error('Error saving deal:', error);
      setCreateError(error?.message || 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {isEditing ? <Pencil className="w-5 h-5 text-white" /> : <PlusCircle className="w-5 h-5 text-white" />}
            {isEditing ? 'Edit Opportunity' : 'Post Investment Opportunity'}
          </h2>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isAdminMode && (
            <div className="bg-neutral-900/60 border border-white/20 rounded-2xl p-3 space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-300">Listing Tag (Admin Only)</label>
              <select
                value={listingType}
                onChange={(e) => setListingType(e.target.value as 'Business' | 'VC')}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/60"
              >
                {ADMIN_TAGS.map((t) => (
                  <option key={t} value={t}>{ADMIN_TAG_LABELS[t]}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Name</label>
            <input
              type="text"
              required
              maxLength={120}
              placeholder="e.g. Anne Nguyen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Stage</label>
            <select
              required
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/60"
            >
              <option value="" disabled>Select stage</option>
              {STAGES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Budget</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{1,5}"
                required
                placeholder="0 - 99999"
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/\D/g, '').slice(0, 5))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Currency</label>
              <select
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/60"
              >
                <option value="" disabled>Select</option>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Origin</label>
              <select
                required
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/60"
              >
                <option value="" disabled>Select origin</option>
                {ORIGINS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Current Location</label>
              <select
                required
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/60"
              >
                <option value="" disabled>Select location</option>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Description <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <textarea
              rows={3}
              maxLength={3000}
              placeholder="Add any extra details (optional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/60 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Photos & Videos <span className="font-normal text-neutral-500">(optional, up to {MAX_MEDIA}; first one is the cover)</span>
            </label>

            {slots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {slots.map((s, i) => {
                  const isVideo = s.kind === 'existing' ? s.mediaKind === 'video' : s.file.type.startsWith('video/');
                  const src = s.kind === 'existing' ? s.url : s.previewUrl;
                  return (
                    <div key={s.kind === 'existing' ? s.key : s.previewUrl} className="relative aspect-square rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800">
                      {isVideo ? (
                        <>
                          <video src={`${src}#t=0.1`} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 left-1 p-1 rounded-full bg-black/60 text-white">
                            <Play className="w-3 h-3" />
                          </span>
                        </>
                      ) : (
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      )}
                      {i === 0 && (
                        <span className="absolute top-1 left-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white text-black">Cover</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeSlot(i)}
                        aria-label="Remove"
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-rose-700 text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {slots.length < MAX_MEDIA && (
              <label className="flex flex-col items-center justify-center gap-1 px-6 py-5 border-2 border-neutral-800 border-dashed rounded-2xl bg-neutral-950 hover:border-white/40 transition cursor-pointer text-center">
                <ImageIcon className="h-7 w-7 text-neutral-500" />
                <span className="text-xs font-semibold text-white">
                  {slots.length === 0 ? 'Add photos or videos' : `Add more (${MAX_MEDIA - slots.length} left)`}
                </span>
                <span className="text-[11px] text-neutral-500">Videos up to {MAX_VIDEO_MB} MB</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/mp4,video/webm,video/quicktime"
                  onChange={(e) => {
                    addMediaFiles(e.target.files);
                    e.target.value = '';
                  }}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          {!isEditing && myCircles.length > 0 && (
            <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-3 space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                <input
                  type="checkbox"
                  checked={postToCircle}
                  onChange={(e) => {
                    setPostToCircle(e.target.checked);
                    if (e.target.checked && !circleId) setCircleId(myCircles[0].id);
                    if (!e.target.checked) setAlsoGlobal(false);
                  }}
                  className="rounded border-neutral-700 bg-neutral-900"
                />
                Post to Private Circle
              </label>
              {postToCircle && (
                <>
                  <select
                    value={circleId}
                    onChange={(e) => setCircleId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/60"
                  >
                    {myCircles.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-xs text-neutral-400">
                    <input
                      type="checkbox"
                      checked={alsoGlobal}
                      onChange={(e) => setAlsoGlobal(e.target.checked)}
                      className="rounded border-neutral-700 bg-neutral-900"
                    />
                    Also show in Global Search
                  </label>
                </>
              )}
            </div>
          )}

          {isEditing && editDeal?.circleId && (
            <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                <input
                  type="checkbox"
                  checked={alsoGlobal}
                  onChange={(e) => setAlsoGlobal(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900"
                />
                Also show in Global Search
              </label>
            </div>
          )}

          <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-3 space-y-2">
            <p className="text-xs font-semibold text-neutral-300">
              Contact / Socials <span className="font-normal text-neutral-500">(optional)</span>
            </p>
            <input
              type="text"
              maxLength={200}
              placeholder="Telegram, phone, or email"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/60"
            />
            <input
              type="text"
              maxLength={300}
              placeholder="Social link (LinkedIn, X, website...)"
              value={socialLink}
              onChange={(e) => setSocialLink(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/60"
            />
            {(contactInfo.trim() || socialLink.trim()) && (
              <label className="flex items-center gap-2 text-xs text-neutral-400">
                <input
                  type="checkbox"
                  checked={contactPublic}
                  onChange={(e) => setContactPublic(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900"
                />
                Share this publicly on the listing (otherwise only you and admins see it)
              </label>
            )}
          </div>

          {createError && (
            <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded-xl px-3 py-2">{createError}</p>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition shadow-lg shadow-black/40 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? (uploadProgress || (isEditing ? 'Saving...' : 'Publishing...')) : (isEditing ? 'Save Changes' : 'Publish Deal')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
