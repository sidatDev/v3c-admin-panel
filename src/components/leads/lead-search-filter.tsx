'use client';

import React from 'react';
import { Search, Calendar, Filter, X, RotateCcw, Sparkles } from 'lucide-react';

export type SearchCriteria = 'client' | 'message' | 'ip' | 'status' | 'date';

export interface LeadFilterValues {
  criteria: SearchCriteria;
  term: string;
  startDate: string;
  endDate: string;
}

interface LeadSearchFilterProps {
  value: LeadFilterValues;
  onChange: (updater: (prev: LeadFilterValues) => LeadFilterValues) => void;
  onReset: () => void;
  isPotentialLeads?: boolean;
}

export const CRITERIA_OPTIONS: { id: SearchCriteria; label: string }[] = [
  { id: 'client', label: 'Client (Name, Email, Phone)' },
  { id: 'message', label: 'Inquiry / Message' },
  { id: 'ip', label: 'Origin & IP' },
  { id: 'status', label: 'AI Qualification' },
  { id: 'date', label: 'Date Captured' },
];

export function LeadSearchFilter({
  value,
  onChange,
  onReset,
  isPotentialLeads = false,
}: LeadSearchFilterProps) {
  const getPlaceholder = (criteria: SearchCriteria) => {
    switch (criteria) {
      case 'client':
        return 'Search by client name, email, or phone...';
      case 'message':
        return 'Search message or inquiry content...';
      case 'ip':
        return 'Search IP address or channel (e.g. chat, voice)...';
      default:
        return 'Search...';
    }
  };

  const hasActiveFilter = Boolean(
    value.term.trim() || value.startDate || value.endDate
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2.5 flex-1">
        {/* CRITERIA SELECTOR DROPDOWN */}
        <div className="relative min-w-[210px]">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Filter className="h-4 w-4" />
          </div>
          <select
            value={value.criteria}
            onChange={(e) => {
              const newCriteria = e.target.value as SearchCriteria;
              onChange((prev) => ({
                ...prev,
                criteria: newCriteria,
                term: prev.criteria === 'status' || newCriteria === 'status' ? '' : prev.term,
              }));
            }}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
          >
            {CRITERIA_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* DYNAMIC SEARCH CONTROL */}
        {value.criteria === 'date' ? (
          /* DATE RANGE PICKER */
          <div className="flex flex-wrap items-center gap-2 animate-fade-in">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <input
                type="date"
                value={value.startDate}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, startDate: e.target.value }))
                }
                title="Start Date"
                className="rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 shadow-2xs transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>
            <span className="text-xs text-slate-400 font-medium">to</span>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <input
                type="date"
                value={value.endDate}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, endDate: e.target.value }))
                }
                title="End Date"
                className="rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 shadow-2xs transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>
          </div>
        ) : value.criteria === 'status' ? (
          /* AI QUALIFICATION STATUS DROPDOWN */
          <div className="relative min-w-[240px] max-w-sm animate-fade-in">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-500">
              <Sparkles className="h-4 w-4" />
            </div>
            <select
              value={value.term}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, term: e.target.value }))
              }
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
            >
              {isPotentialLeads ? (
                <>
                  <option value="">All Confidence Tiers</option>
                  <option value="high">High Intent (≥ 80%)</option>
                  <option value="moderate">Moderate Intent (65% - 79%)</option>
                  <option value="warm">Warm Lead (&lt; 65%)</option>
                </>
              ) : (
                <>
                  <option value="">All Qualification Statuses</option>
                  <option value="qualified">Qualified</option>
                  <option value="unqualified">Unqualified / In Review</option>
                </>
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        ) : (
          /* STANDARD TEXT INPUT */
          <div className="relative flex-1 min-w-[260px] max-w-md animate-fade-in">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={value.term}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, term: e.target.value }))
              }
              placeholder={getPlaceholder(value.criteria)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs text-slate-800 shadow-2xs transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
            />
            {value.term && (
              <button
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, term: '' }))}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* RESET / CLEAR FILTERS BUTTON */}
        {hasActiveFilter && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 shadow-2xs transition-all hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear Filter</span>
          </button>
        )}
      </div>
    </div>
  );
}
