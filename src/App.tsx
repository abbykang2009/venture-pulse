import React, { useState } from 'react';

interface Deal {
  id: string;
  title: string;
  stage: string;
  description: string;
  amountNeeded: string;
  location: string;
}

const INITIAL_DEALS: Deal[] = [
  {
    id: '1',
    title: 'Fintech Cross-Border Payments',
    stage: 'Seed',
    description: 'B2B payment rail infrastructure expansion across Southeast Asia.',
    amountNeeded: '$1.5M',
    location: 'Singapore'
  },
  {
    id: '2',
    title: 'AI Workflow Automation Platform',
    stage: 'Pre-Seed',
    description: 'LLM-powered document processing agent for enterprise compliance.',
    amountNeeded: '$500k',
    location: 'Remote'
  },
  {
    id: '3',
    title: 'Logistics Optimization API',
    stage: 'Series A',
    description: 'Route planning and telemetry data analytics for regional fleets.',
    amountNeeded: '$5.0M',
    location: 'Vietnam'
  }
];

export default function App() {
  const [selectedStage, setSelectedStage] = useState('All');
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);

  const filteredDeals = selectedStage === 'All' 
    ? deals 
    : deals.filter(deal => deal.stage === selectedStage);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* Stage Filters */}
      <div className="flex gap-2 mb-6">
        {['All', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Others'].map((stage) => (
          <button
            key={stage}
            onClick={() => setSelectedStage(stage)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedStage === stage ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {stage}
          </button>
        ))}
      </div>

      {/* Content Feed */}
      {filteredDeals.length === 0 ? (
        <div className="border border-slate-800 rounded-xl p-12 text-center text-slate-400">
          No investment opportunities found for this stage.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDeals.map((deal) => (
            <div key={deal.id} className="border border-slate-800 bg-slate-900 p-6 rounded-xl space-y-3">
              <span className="text-xs px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-400 font-semibold">
                {deal.stage}
              </span>
              <h3 className="text-lg font-bold">{deal.title}</h3>
              <p className="text-sm text-slate-400">{deal.description}</p>
              <div className="text-xs text-slate-500 flex justify-between pt-2 border-t border-slate-800">
                <span>Target: {deal.amountNeeded}</span>
                <span>{deal.location}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
