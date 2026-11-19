import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { getCopy } from '../i18n/translations';
import { Language, Recipe, RecipeCollection, SocialPlatform } from '../types/recipe';
import { formatPlatformLabel } from '../utils/recipeParser';
import { PlatformIcon } from './PlatformIcon';
import { RecipeCard } from './RecipeCard';
import { RecipeSearchBar, RecipeSearchEmpty } from './RecipeSearchBar';

interface DiscoverViewProps {
  lang: Language;
  recipes: Recipe[];
  collections: RecipeCollection[];
  activeTag: string;
  onActiveTagChange: (tag: string) => void;
  onOpenRecipe: (recipe: Recipe) => void;
  onToggleFavorite: (recipeId: string) => void;
  onOpenCollectionPicker: (recipeId: string) => void;
  onOpenImportModal: () => void;
  onEditRecipe: (recipe: Recipe) => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  lang,
  recipes,
  collections,
  activeTag,
  onActiveTagChange,
  onOpenRecipe,
  onToggleFavorite,
  onOpenCollectionPicker,
  onOpenImportModal,
  onEditRecipe,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | SocialPlatform>('all');
  const t = getCopy(lang);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    recipes.forEach((r) => {
      r.tags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [recipes]);

  const filteredResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recipes
      .map((recipe) => {
        if (platformFilter !== 'all' && recipe.platform !== platformFilter) {
          return null;
        }
        if (activeTag !== 'all' && !recipe.tags.some((tag) => tag.toLowerCase() === activeTag.toLowerCase())) {
          return null;
        }

        let transcriptMatch: { timestampSec: number; text: string } | null = null;

        if (q) {
          const inTitle =
            recipe.title.toLowerCase().includes(q) ||
            Boolean(recipe.videoTitle && recipe.videoTitle.toLowerCase().includes(q));
          const inCreator =
            recipe.creatorHandle.toLowerCase().includes(q) ||
            recipe.creatorName.toLowerCase().includes(q);
          const inTags = recipe.tags.some((tag) => tag.toLowerCase().includes(q));
          const inIngredients = recipe.ingredients.some((i) => i.item.toLowerCase().includes(q));
          const inSteps = recipe.steps.some((s) => s.instruction.toLowerCase().includes(q));
          const matchedSeg = recipe.transcript.find((seg) => seg.text.toLowerCase().includes(q));

          if (matchedSeg) {
            transcriptMatch = { timestampSec: matchedSeg.startSec, text: matchedSeg.text };
          }

          if (!inTitle && !inCreator && !inTags && !inIngredients && !inSteps && !matchedSeg) {
            return null;
          }
        }

        return { recipe, transcriptMatch };
      })
      .filter(
        (
          item
        ): item is { recipe: Recipe; transcriptMatch: { timestampSec: number; text: string } | null } =>
          item !== null
      );
  }, [recipes, platformFilter, activeTag, searchQuery]);

  const getCollectionCount = (recipeId: string) =>
    collections.filter((c) => c.recipeIds.includes(recipeId)).length;

  return (
    <div className="space-y-5 pb-24 md:pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
            {t.discover.heading}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t.discover.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenImportModal}
          className="md:hidden min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 transition"
        >
          <Plus className="w-4 h-4" />
          <span>{t.discover.saveFromLinkBtn}</span>
        </button>
      </div>

      {/* Search + Platform Filter Row */}
      <div className="flex flex-col lg:flex-row gap-3">
        <RecipeSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t.discover.searchPlaceholder}
          clearAriaLabel={t.discover.clearFilters}
          className="flex-1"
        />

        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-200/75 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 overflow-x-auto no-scrollbar">
          {(['all', 'instagram', 'tiktok', 'facebook', 'youtube'] as const).map((plat) => {
            const active = platformFilter === plat;
            const count =
              plat === 'all' ? recipes.length : recipes.filter((r) => r.platform === plat).length;
            return (
              <button
                key={plat}
                type="button"
                onClick={() => setPlatformFilter(plat)}
                className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {plat !== 'all' && <PlatformIcon platform={plat} className="w-3.5 h-3.5" />}
                <span>{plat === 'all' ? t.discover.allSources : formatPlatformLabel(plat, lang)}</span>
                <span className="font-mono text-[11px] opacity-65 tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Tag Filter Strip */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5" role="group" aria-label={t.discover.allTags}>
          <button
            type="button"
            onClick={() => onActiveTagChange('all')}
            className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition ${
              activeTag === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            {t.discover.allTags}
          </button>
          {allTags.map((tag) => {
            const active = activeTag.toLowerCase() === tag.toLowerCase();
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onActiveTagChange(active ? 'all' : tag)}
                className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {(searchQuery || platformFilter !== 'all' || activeTag !== 'all') && recipes.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="tabular-nums">
            {t.discover.showingCount(filteredResults.length, recipes.length)}
          </span>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setPlatformFilter('all');
              onActiveTagChange('all');
            }}
            className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            {t.discover.clearFilters}
          </button>
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 sm:p-12 text-center">
          <div className="mx-auto flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400 mb-4">
            <PlatformIcon platform="instagram" className="w-5 h-5" />
            <PlatformIcon platform="tiktok" className="w-5 h-5" />
            <PlatformIcon platform="facebook" className="w-5 h-5" />
            <PlatformIcon platform="youtube" className="w-5 h-5" />
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            {t.discover.emptyTitle}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {t.discover.emptyBody}
          </p>
          <button
            type="button"
            onClick={onOpenImportModal}
            className="mt-6 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t.discover.emptyCta}</span>
          </button>
        </div>
      ) : filteredResults.length === 0 ? (
        <RecipeSearchEmpty title={t.discover.noMatchesTitle} body={t.discover.noMatchesBody} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResults.map(({ recipe, transcriptMatch }) => (
            <RecipeCard
              key={recipe.id}
              lang={lang}
              recipe={recipe}
              collectionCount={getCollectionCount(recipe.id)}
              transcriptMatchPreview={transcriptMatch}
              onOpenRecipe={onOpenRecipe}
              onToggleFavorite={onToggleFavorite}
              onOpenCollectionPicker={onOpenCollectionPicker}
              onEditRecipe={onEditRecipe}
            />
          ))}
        </div>
      )}
    </div>
  );
};
