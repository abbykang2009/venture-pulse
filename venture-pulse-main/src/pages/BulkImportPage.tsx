import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { STAGES, ORIGINS, LOCATIONS, CURRENCIES, MAX_BUDGET } from '../constants';

type FieldKey =
  | 'name' | 'stage' | 'origin' | 'location' | 'budget' | 'currency'
  | 'description' | 'contactInfo' | 'socialLink' | 'contactPublic' | 'listingType' | 'circleName' | 'alsoGlobal';

const HEADER_ALIASES: Record<FieldKey, string[]> = {
  name: ['name'],
  stage: ['stage'],
  origin: ['origin'],
  location: ['location', 'current location'],
  budget: ['budget', 'budget (per share)'],
  currency: ['currency'],
  description: ['description'],
  contactInfo: ['contact', 'contact info'],
  socialLink: ['social', 'social link'],
  contactPublic: ['public contact', 'share publicly', 'public'],
  listingType: ['tag', 'listing tag'],
  circleName: ['circle'],
  alsoGlobal: ['also global', 'also show in global search'],
};

const TEMPLATE_HEADERS = ['Name', 'Stage', 'Origin', 'Location', 'Budget', 'Currency', 'Description', 'Contact', 'Social', 'Public Contact', 'Tag', 'Circle', 'Also Global'];
const TEMPLATE_EXAMPLE = ['Acme Robotics', 'Seed Round', 'Vietnam', 'Ho Chi Minh (HCM)', '500', 'USD', 'Robotics startup demoed at the summit', 'https://t.me/acme', 'https://acme.co', 'no', '', '', ''];

function toBool(v: string | undefined) {
  return ['yes', 'y', 'true', '1'].includes((v || '').trim().toLowerCase());
}

function parseTable(text: string): { headers: string[]; rows: string[][] } {
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!clean) return { headers: [], rows: [] };
  const delim = clean.includes('\t') ? '\t' : ',';
  const lines = clean.split('\n').filter((l) => l.trim().length > 0);

  const parseLine = (line: string): string[] => {
    if (delim === '\t') return line.split('\t').map((c) => c.trim());
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
        } else cur += ch;
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        out.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    out.push(cur.trim());
    return out;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

interface ParsedRow {
  rowNum: number;
  raw: Record<FieldKey, string>;
  errors: string[];
}

function buildRows(text: string): { rows: ParsedRow[]; unmatchedHeaders: boolean } {
  const { headers, rows } = parseTable(text);
  if (headers.length === 0) return { rows: [], unmatchedHeaders: false };

  const colIndex: Partial<Record<FieldKey, number>> = {};
  (Object.keys(HEADER_ALIASES) as FieldKey[]).forEach((key) => {
    const idx = headers.findIndex((h) => HEADER_ALIASES[key].includes(h));
    if (idx !== -1) colIndex[key] = idx;
  });
  const requiredFound = (['name', 'stage', 'origin', 'location', 'budget', 'currency'] as FieldKey[]).every((k) => colIndex[k] !== undefined);

  const parsed: ParsedRow[] = rows.map((cells, i) => {
    const raw = {} as Record<FieldKey, string>;
    (Object.keys(HEADER_ALIASES) as FieldKey[]).forEach((key) => {
      const idx = colIndex[key];
      raw[key] = idx !== undefined ? (cells[idx] || '') : '';
    });

    const errors: string[] = [];
    if (!raw.name.trim()) errors.push('Name is required');
    if (!STAGES.includes(raw.stage.trim())) errors.push(`Stage "${raw.stage}" is not valid`);
    if (!ORIGINS.includes(raw.origin.trim())) errors.push(`Origin "${raw.origin}" is not valid`);
    if (!LOCATIONS.includes(raw.location.trim())) errors.push(`Location "${raw.location}" is not valid`);
    if (!CURRENCIES.includes(raw.currency.trim())) errors.push(`Currency "${raw.currency}" is not valid`);
    const budgetNum = Number(raw.budget.replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(budgetNum) || !Number.isInteger(budgetNum) || budgetNum < 0 || budgetNum > MAX_BUDGET) {
      errors.push(`Budget must be a whole number from 0 to ${MAX_BUDGET}`);
    }

    return { rowNum: i + 1, raw, errors };
  });

  return { rows: parsed, unmatchedHeaders: !requiredFound };
}

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS, TEMPLATE_EXAMPLE]
    .map((r) => r.map((c) => (c.includes(',') ? `"${c.replace(/"/g, '""')}"` : c)).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'venturepulse-bulk-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkImportPage({ onUnauthorized }: { onUnauthorized: () => void }) {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ created: { row: number; id: string; name: string }[]; errors: { row: number; error: string }[] } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const { rows, unmatchedHeaders } = useMemo(() => buildRows(text), [text]);
  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  const handleFile = async (file: File) => {
    const content = await file.text();
    setText(content);
    setResult(null);
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setIsImporting(true);
    setServerError(null);
    setResult(null);
    try {
      const payload = validRows.map((r) => ({
        name: r.raw.name.trim(),
        stage: r.raw.stage.trim(),
        origin: r.raw.origin.trim(),
        location: r.raw.location.trim(),
        budget: r.raw.budget,
        currency: r.raw.currency.trim(),
        description: r.raw.description.trim(),
        contactInfo: r.raw.contactInfo.trim(),
        socialLink: r.raw.socialLink.trim(),
        contactPublic: toBool(r.raw.contactPublic),
        listingType: r.raw.listingType.trim(),
        circleName: r.raw.circleName.trim(),
        alsoGlobal: toBool(r.raw.alsoGlobal),
      }));

      const res = await fetch('/api/deals/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payload }),
      });
      if (res.status === 401) return onUnauthorized();
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data.created) {
        setServerError(data.error || 'Import failed.');
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error('Bulk import failed:', err);
      setServerError('Network error. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Feed
      </Link>

      <div>
        <h2 className="text-xl font-bold text-white">Bulk Import Opportunities</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Prepare a sheet with one row per opportunity, then paste or upload it here. No photos/videos yet — add those afterward by editing each listing.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold rounded-xl transition"
        >
          <Download className="w-3.5 h-3.5" /> Download Template (CSV)
        </button>

        <label className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold rounded-xl transition cursor-pointer">
          <Upload className="w-3.5 h-3.5" /> Upload CSV File
          <input
            type="file"
            accept=".csv,.tsv,.txt"
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
        </label>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-neutral-300">
          Or paste directly from Google Sheets (select your cell range, copy, then paste below)
        </label>
        <textarea
          rows={8}
          value={text}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="Name	Stage	Origin	Location	Budget	Currency	Description ..."
          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-white/60 resize-none"
        />
      </div>

      {text.trim() && unmatchedHeaders && (
        <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded-xl px-3 py-2">
          Couldn't find all the required columns (Name, Stage, Origin, Location, Budget, Currency). Check your header row matches the template.
        </p>
      )}

      {rows.length > 0 && !unmatchedHeaders && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> {validRows.length} ready to import</span>
            {invalidRows.length > 0 && (
              <span className="flex items-center gap-1.5 text-rose-400"><AlertTriangle className="w-3.5 h-3.5" /> {invalidRows.length} need fixing</span>
            )}
          </div>

          <div className="border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-neutral-900 text-neutral-400 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Row</th>
                    <th className="text-left px-3 py-2 font-semibold">Name</th>
                    <th className="text-left px-3 py-2 font-semibold">Stage</th>
                    <th className="text-left px-3 py-2 font-semibold">Origin</th>
                    <th className="text-left px-3 py-2 font-semibold">Location</th>
                    <th className="text-left px-3 py-2 font-semibold">Budget</th>
                    <th className="text-left px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rowNum} className={`border-t border-neutral-800/80 ${r.errors.length ? 'bg-rose-950/20' : ''}`}>
                      <td className="px-3 py-2 text-neutral-500">{r.rowNum}</td>
                      <td className="px-3 py-2 text-white">{r.raw.name || '—'}</td>
                      <td className="px-3 py-2 text-neutral-300">{r.raw.stage || '—'}</td>
                      <td className="px-3 py-2 text-neutral-300">{r.raw.origin || '—'}</td>
                      <td className="px-3 py-2 text-neutral-300">{r.raw.location || '—'}</td>
                      <td className="px-3 py-2 text-neutral-300">{r.raw.currency} {r.raw.budget}</td>
                      <td className="px-3 py-2">
                        {r.errors.length ? (
                          <span className="text-rose-400">{r.errors.join('; ')}</span>
                        ) : (
                          <span className="text-emerald-400">Ready</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={isImporting || validRows.length === 0}
            className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-sm font-semibold rounded-xl transition shadow-lg shadow-black/40 disabled:opacity-50 flex items-center gap-2"
          >
            {isImporting && <Loader2 className="w-4 h-4 animate-spin" />}
            Import {validRows.length} Opportunit{validRows.length === 1 ? 'y' : 'ies'}
          </button>
        </div>
      )}

      {serverError && <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded-xl px-3 py-2">{serverError}</p>}

      {result && (
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 space-y-3">
          <p className="text-sm text-white font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Imported {result.created.length} opportunit{result.created.length === 1 ? 'y' : 'ies'}
          </p>
          {result.errors.length > 0 && (
            <div className="text-xs text-rose-400 space-y-1">
              {result.errors.map((e) => <p key={e.row}>Row {e.row}: {e.error}</p>)}
            </div>
          )}
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition"
          >
            Go to Feed
          </button>
        </div>
      )}
    </div>
  );
}
