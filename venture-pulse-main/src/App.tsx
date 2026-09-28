import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  MapPin, 
  Building2, 
  DollarSign, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ShieldCheck, 
  Sparkles,
  Play
} from 'lucide-react';

interface Deal {
  id: string;
  name: string;
  type: string; // 'Solo' | 'Agency'
  origin: string;
  current_location: string;
  stage: string;
  budget: number;
  currency: string;
  description?: string;
  media_urls?: string[];
  created_by_admin: boolean;
  user_name?: string;
}

const ORIGIN_OPTIONS = ['Thailand', 'Vietnam', 'China', 'Malaysia', 'Singapore', 'Others'];
const LOCATION_OPTIONS = ['Johor Bahru (JB)', 'Kuala Lumpur (KL)', 'Singapore', 'Hanoi', 'Ho Chi Minh (HCM)', 'Others'];
const STAGE_OPTIONS = ['Type 1', 'Type 2', 'Type 3', 'Type 4', 'Others'];
const CURRENCY_OPTIONS = ['MYR', 'SGD', 'VND', 'THB', 'RMB', 'USD'];

export default function App() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); // Admin toggle for demo/posting

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    adminPostingType: 'Business', // 'Business' -> Solo, 'VC' -> Agency
    origin: 'Singapore',
    current_location: 'Singapore',
    stage: 'Type 1',
    budget: '',
    currency: 'MYR',
    description: '',
    mediaFiles: [] as string[],
  });

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    // Up to 9 photos/videos limit
    if (formData.mediaFiles.length + files.length > 9) {
      alert("You can upload a maximum of 9 media files.");
      return;
    }

    const newUrls = files.map(file => URL.createObjectURL(file));
    setFormData(prev => ({ ...prev, mediaFiles: [...prev.mediaFiles, ...newUrls] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Map Admin selections (Business -> Solo, VC -> Agency)
    let dealType = 'Solo';
    if (isAdmin) {
      dealType = formData.adminPostingType === 'Business' ? 'Solo' : 'Agency';
    }

    const newDeal: Deal = {
      id: Date.now().toString(),
      name: formData.name,
      type: dealType,
      origin: formData.origin,
      current_location: formData.current_location,
      stage: formData.stage,
      budget: Number(formData.budget),
      currency: formData.currency,
      description: formData.description,
      media_urls: formData.mediaFiles,
      created_by_admin: isAdmin,
    };

    setDeals([newDeal, ...deals]);
    setIsModalOpen(false);
    // Reset Form
    setFormData({
      name: '',
      adminPostingType: 'Business',
      origin: 'Singapore',
      current_location: 'Singapore',
      stage: 'Type 1',
      budget: '',
      currency: 'MYR',
      description: '',
      mediaFiles: [],
    });
  };

  const isVideoUrl = (url: string) => {
    return url.includes('video') || url.endsWith('.mp4') || url.endsWith('.webm');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#121212]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold tracking-widest text-amber-400 uppercase font-serif">
              Black Book
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                isAdmin 
                  ? 'bg-amber-400/10 border-amber-400 text-amber-400' 
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              {isAdmin ? 'Admin Mode' : 'User Mode'}
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-medium text-sm px-4 py-2 rounded-lg transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              New Opportunity
            </button>
          </div>
        </div>
      </header>

      {/* Main Content / Deal Grid */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {deals.map((deal) => {
            // Ribbon only shown if created by admin
            const showRibbon = deal.created_by_admin;
            const ribbonLabel = deal.type === 'Solo' ? 'Business' : 'VC';

            return (
              <div
                key={deal.id}
                onClick={() => {
                  setSelectedDeal(deal);
                  setCurrentMediaIndex(0);
                }}
                className="relative bg-[#121212] border border-zinc-800 hover:border-amber-500/40 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:shadow-amber-500/5 group"
              >
                {/* Admin Ribbon */}
                {showRibbon && (
                  <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold text-xs px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {ribbonLabel}
                  </div>
                )}

                {/* Cover Image/Video */}
                <div className="h-48 bg-zinc-900 relative overflow-hidden">
                  {deal.media_urls && deal.media_urls.length > 0 ? (
                    isVideoUrl(deal.media_urls[0]) ? (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                        <Play className="w-8 h-8 text-amber-400" />
                      </div>
                    ) : (
                      <img
                        src={deal.media_urls[0]}
                        alt={deal.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
                      No Media
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-lg text-zinc-100 group-hover:text-amber-400 transition-colors">
                    {deal.name}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      <span>{deal.origin}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>{deal.current_location}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-sm">
                    <span className="text-zinc-400 text-xs">{deal.stage}</span>
                    <span className="font-semibold text-amber-400">
                      {deal.currency} {deal.budget.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Detail Swipe View Drawer / Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-zinc-800 w-full max-w-sm rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Media Gallery Header (Tinder Style) */}
            <div className="relative h-96 bg-black flex items-center justify-center">
              <button
                onClick={() => setSelectedDeal(null)}
                className="absolute top-3 right-3 z-20 bg-black/60 hover:bg-black text-white p-2 rounded-full border border-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Progress Bars for Media */}
              {selectedDeal.media_urls && selectedDeal.media_urls.length > 1 && (
                <div className="absolute top-3 inset-x-4 z-10 flex gap-1">
                  {selectedDeal.media_urls.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        idx === currentMediaIndex ? 'bg-amber-400' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Active Media Display */}
              {selectedDeal.media_urls && selectedDeal.media_urls.length > 0 ? (
                isVideoUrl(selectedDeal.media_urls[currentMediaIndex]) ? (
                  <video
                    src={selectedDeal.media_urls[currentMediaIndex]}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={selectedDeal.media_urls[currentMediaIndex]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="text-zinc-500 text-sm">No photos available</div>
              )}

              {/* Left/Right Swipe Nav Controls */}
              {selectedDeal.media_urls && selectedDeal.media_urls.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentMediaIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentMediaIndex === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/80 rounded-full text-white disabled:opacity-0 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentMediaIndex((prev) =>
                        Math.min(selectedDeal.media_urls!.length - 1, prev + 1)
                      )
                    }
                    disabled={currentMediaIndex === selectedDeal.media_urls.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/80 rounded-full text-white disabled:opacity-0 transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Deal Info Details */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold text-zinc-100">{selectedDeal.name}</h2>
                <span className="text-amber-400 font-semibold text-base">
                  {selectedDeal.currency} {selectedDeal.budget.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-zinc-300 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                <div>
                  <span className="text-zinc-500 block">Origin</span>
                  <span className="font-medium text-zinc-200">{selectedDeal.origin}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Current Location</span>
                  <span className="font-medium text-zinc-200">{selectedDeal.current_location}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Stage</span>
                  <span className="font-medium text-zinc-200">{selectedDeal.stage}</span>
                </div>
              </div>

              {selectedDeal.description && (
                <div>
                  <span className="text-xs text-zinc-500 block mb-1">Description</span>
                  <p className="text-sm text-zinc-300 leading-relaxed">{selectedDeal.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Posting Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-zinc-800 w-full max-w-md rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-zinc-100 mb-4 border-b border-zinc-800 pb-2">
              Post New Opportunity
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {/* Admin Type Mapping Selector */}
              {isAdmin && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg space-y-2">
                  <label className="text-xs text-amber-400 font-medium block">
                    Admin Posting Classification
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                      <input
                        type="radio"
                        name="adminPostingType"
                        value="Business"
                        checked={formData.adminPostingType === 'Business'}
                        onChange={(e) =>
                          setFormData({ ...formData, adminPostingType: e.target.value })
                        }
                        className="accent-amber-500"
                      />
                      Business (Solo)
                    </label>
                    <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                      <input
                        type="radio"
                        name="adminPostingType"
                        value="VC"
                        checked={formData.adminPostingType === 'VC'}
                        onChange={(e) =>
                          setFormData({ ...formData, adminPostingType: e.target.value })
                        }
                        className="accent-amber-500"
                      />
                      VC (Agency)
                    </label>
                  </div>
                </div>
              )}

              {/* Name Field */}
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elly"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Origin Dropdown */}
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Origin *</label>
                <select
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  {ORIGIN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Location Dropdown */}
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Current Location *</label>
                <select
                  value={formData.current_location}
                  onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  {LOCATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stage Dropdown */}
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Stage *</label>
                <select
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  {STAGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Budget & Currency Input */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Budget *</label>
                  <input
                    type="number"
                    min="0"
                    max="99999"
                    required
                    placeholder="0 - 99999"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Currency *</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    {CURRENCY_OPTIONS.map((curr) => (
                      <option key={curr} value={curr}>
                        {curr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Description */}
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  Description <span className="text-xs text-zinc-500">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add additional background details..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Optional Photos/Videos */}
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  Photos/Videos <span className="text-xs text-zinc-500">(Optional, up to 9)</span>
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-amber-400 hover:file:bg-zinc-700 cursor-pointer"
                />
                {formData.mediaFiles.length > 0 && (
                  <p className="text-xs text-amber-500 mt-1">
                    {formData.mediaFiles.length} item(s) selected
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2.5 rounded-lg transition-all mt-4"
              >
                Publish Opportunity
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
