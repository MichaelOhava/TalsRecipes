import React, { useEffect, useState } from 'react';
import { ArrowLeft, FolderPlus, Plus, Trash2, UtensilsCrossed, X } from 'lucide-react';
import { getCopy } from '../i18n/translations';
import {
  COLLECTION_ACCENT_DOT,
  COLLECTION_ACCENTS,
  CollectionAccent,
  Language,
  Recipe,
  RecipeCollection,
} from '../types/recipe';
import { RecipeImage } from './PlatformIcon';
import { RecipeCard } from './RecipeCard';

interface CollectionsViewProps {
  lang: Language;
  collections: RecipeCollection[];
  recipes: Recipe[];
  resetSignal?: number;
  onCreateCollection: (name: string, description: string, accent: CollectionAccent) => void;
  onDeleteCollection: (collectionId: string) => void;
  onRemoveRecipeFromCollection: (collectionId: string, recipeId: string) => void;
  onOpenRecipe: (recipe: Recipe) => void;
  onToggleFavorite: (recipeId: string) => void;
  onOpenCollectionPicker: (recipeId: string) => void;
  onEditRecipe: (recipe: Recipe) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  lang,
  collections,
  recipes,
  resetSignal,
  onCreateCollection,
  onDeleteCollection,
  onRemoveRecipeFromCollection,
  onOpenRecipe,
  onToggleFavorite,
  onOpenCollectionPicker,
  onEditRecipe,
}) => {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accent, setAccent] = useState<CollectionAccent>('emerald');
  const t = getCopy(lang);

  useEffect(() => {
    if (resetSignal) {
      setSelectedCollectionId(null);
    }
  }, [resetSignal]);

  const selectedCollection = collections.find((c) => c.id === selectedCollectionId) || null;

  const getCollectionCount = (recipeId: string) =>
    collections.filter((c) => c.recipeIds.includes(recipeId)).length;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateCollection(name.trim(), description.trim() || t.collections.defaultDesc, accent);
    setName('');
    setDescription('');
    setAccent('emerald');
    setShowCreateModal(false);
  };

  if (selectedCollection) {
    const memberRecipes = recipes.filter((r) => selectedCollection.recipeIds.includes(r.id));

    return (
      <div className="space-y-6 pb-24 md:pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedCollectionId(null)}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl px-3 -ms-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span>{t.collections.allCollections}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDeleteCollection(selectedCollection.id);
              setSelectedCollectionId(null);
            }}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t.collections.deleteCollection}</span>
          </button>
        </div>

        <div>
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full ${COLLECTION_ACCENT_DOT[selectedCollection.accent]}`} />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              {memberRecipes.length}{' '}
              {memberRecipes.length === 1 ? t.collections.recipeSingle : t.collections.recipePlural}
            </span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {selectedCollection.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {selectedCollection.description}
          </p>
        </div>

        {memberRecipes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
            <UtensilsCrossed className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t.collections.emptyTitle}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t.collections.emptyBody}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {memberRecipes.map((recipe) => (
              <div key={recipe.id} className="space-y-2">
                <RecipeCard
                  lang={lang}
                  recipe={recipe}
                  collectionCount={getCollectionCount(recipe.id)}
                  onOpenRecipe={onOpenRecipe}
                  onToggleFavorite={onToggleFavorite}
                  onOpenCollectionPicker={onOpenCollectionPicker}
                  onEditRecipe={onEditRecipe}
                />
                <button
                  type="button"
                  onClick={() => onRemoveRecipeFromCollection(selectedCollection.id, recipe.id)}
                  className="w-full min-h-[38px] text-xs font-medium text-slate-500 hover:text-rose-600 transition"
                >
                  {t.collections.removeFrom(selectedCollection.name)}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t.collections.heading}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t.collections.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 transition whitespace-nowrap"
        >
          <FolderPlus className="w-4 h-4" />
          <span>{t.collections.newCollection}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {collections.map((col) => {
          const memberRecipes = recipes.filter((r) => col.recipeIds.includes(r.id));
          const previews = memberRecipes.slice(0, 3);
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setSelectedCollectionId(col.id)}
              className="group text-start rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col"
            >
              <div className="grid grid-cols-3 gap-0.5 h-32 w-full bg-slate-100 dark:bg-slate-800">
                {[0, 1, 2].map((slot) => {
                  const item = previews[slot];
                  return item ? (
                    <RecipeImage
                      key={item.id}
                      src={item.coverImage}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      key={slot}
                      className="w-full h-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-300 dark:text-slate-700"
                    >
                      <UtensilsCrossed className="w-5 h-5" />
                    </div>
                  );
                })}
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className={`w-2.5 h-2.5 rounded-full ${COLLECTION_ACCENT_DOT[col.accent]}`} />
                  <span className="tabular-nums font-medium">
                    {memberRecipes.length}{' '}
                    {memberRecipes.length === 1 ? t.collections.recipeSingle : t.collections.recipePlural}
                  </span>
                </div>
                <h2 className="mt-1.5 font-display text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {col.name}
                </h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {col.description}
                </p>
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="min-h-[210px] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-2 p-6 text-slate-500 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
        >
          <Plus className="w-7 h-7" />
          <span className="text-sm font-semibold">{t.collections.createCollection}</span>
        </button>
      </div>

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-col-title"
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 p-6 border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 id="create-col-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {t.collections.newCollection}
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
                className="min-h-[44px] min-w-[44px] -me-2 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.collections.nameLabel}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.collections.namePlaceholder}
                  autoFocus
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.collections.descLabel}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.collections.descPlaceholder}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {t.collections.colorMarker}
                </label>
                <div className="flex items-center gap-3">
                  {COLLECTION_ACCENTS.map((acc) => (
                    <button
                      key={acc}
                      type="button"
                      onClick={() => setAccent(acc)}
                      aria-label={acc}
                      className={`w-8 h-8 rounded-full ${COLLECTION_ACCENT_DOT[acc]} ${
                        accent === acc ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 pb-safe flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  {t.collections.cancel}
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  {t.collections.createCollection}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
