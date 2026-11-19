import React, { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { getCopy } from '../i18n/translations';
import {
  COLLECTION_ACCENT_DOT,
  COLLECTION_ACCENTS,
  CollectionAccent,
  Language,
  Recipe,
  RecipeCollection,
} from '../types/recipe';

interface CollectionPickerModalProps {
  lang: Language;
  recipe: Recipe | null;
  collections: RecipeCollection[];
  onClose: () => void;
  onToggleRecipeInCollection: (collectionId: string, recipeId: string) => void;
  onCreateCollection: (name: string, description: string, accent: CollectionAccent, initialRecipeId?: string) => void;
}

export const CollectionPickerModal: React.FC<CollectionPickerModalProps> = ({
  lang,
  recipe,
  collections,
  onClose,
  onToggleRecipeInCollection,
  onCreateCollection,
}) => {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAccent, setNewAccent] = useState<CollectionAccent>('emerald');
  const t = getCopy(lang);

  if (!recipe) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateCollection(newName.trim(), newDesc.trim() || t.collections.defaultDesc, newAccent, recipe.id);
    setNewName('');
    setNewDesc('');
    setCreating(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-picker-title"
    >
      <div className="w-full sm:max-w-md max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-3 sm:hidden" />

        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id="collection-picker-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {t.collections.saveToCollectionTitle}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
              {recipe.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] -me-2 -mt-1 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {collections.map((col) => {
            const isMember = col.recipeIds.includes(recipe.id);
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => onToggleRecipeInCollection(col.id, recipe.id)}
                className={`w-full min-h-[56px] flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-start border transition ${
                  isMember
                    ? 'border-emerald-500/60 bg-emerald-50/70 dark:bg-emerald-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-3 h-3 rounded-full shrink-0 ${COLLECTION_ACCENT_DOT[col.accent]}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {col.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {col.recipeIds.length}{' '}
                      {col.recipeIds.length === 1 ? t.collections.recipeSingle : t.collections.recipePlural}
                    </div>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition ${
                    isMember
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {isMember && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>
            );
          })}

          {creating ? (
            <form onSubmit={handleCreate} className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/70 dark:bg-slate-800/40">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.collections.nameLabel}
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t.collections.namePlaceholder}
                  autoFocus
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.collections.descLabel}
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder={t.collections.descPlaceholder}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  {COLLECTION_ACCENTS.map((acc) => (
                    <button
                      key={acc}
                      type="button"
                      onClick={() => setNewAccent(acc)}
                      aria-label={acc}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                        newAccent === acc ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900' : ''
                      } ${COLLECTION_ACCENT_DOT[acc]}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="min-h-[40px] px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700"
                  >
                    {t.collections.cancel}
                  </button>
                  <button
                    type="submit"
                    className="min-h-[40px] px-4 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    {t.collections.createAndAdd}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t.collections.createCollection}</span>
            </button>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition"
          >
            {t.collections.done}
          </button>
        </div>
      </div>
    </div>
  );
};
