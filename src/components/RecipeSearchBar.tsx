import React from 'react';
import { Search, X } from 'lucide-react';

interface RecipeSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  clearAriaLabel: string;
  minHeightClass?: string;
  className?: string;
}

export const RecipeSearchBar: React.FC<RecipeSearchBarProps> = ({
  value,
  onChange,
  placeholder,
  clearAriaLabel,
  minHeightClass = 'min-h-[48px]',
  className = '',
}) => (
  <div className={`relative ${className}`}>
    <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={`w-full ${minHeightClass} rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ps-10 pe-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label={clearAriaLabel}
        className="absolute end-2 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

interface RecipeSearchEmptyProps {
  title: string;
  body: string;
}

export const RecipeSearchEmpty: React.FC<RecipeSearchEmptyProps> = ({ title, body }) => (
  <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
    <Search className="w-8 h-8 text-slate-400 mx-auto mb-2" />
    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</p>
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{body}</p>
  </div>
);
