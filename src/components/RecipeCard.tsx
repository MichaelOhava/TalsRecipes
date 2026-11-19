import React from 'react';
import { Bookmark, Clock, ExternalLink, FolderPlus, Pencil } from 'lucide-react';
import { getCopy } from '../i18n/translations';
import { Language, Recipe } from '../types/recipe';
import { formatPlatformLabel, formatTimestamp } from '../utils/recipeParser';
import { PlatformIcon, RecipeImage } from './PlatformIcon';

interface RecipeCardProps {
  lang: Language;
  recipe: Recipe;
  collectionCount: number;
  transcriptMatchPreview?: { timestampSec: number; text: string } | null;
  onOpenRecipe: (recipe: Recipe) => void;
  onToggleFavorite: (recipeId: string) => void;
  onOpenCollectionPicker: (recipeId: string) => void;
  onEditRecipe?: (recipe: Recipe) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  lang,
  recipe,
  collectionCount,
  transcriptMatchPreview,
  onOpenRecipe,
  onToggleFavorite,
  onOpenCollectionPicker,
  onEditRecipe,
}) => {
  const t = getCopy(lang);
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;
  const platName = formatPlatformLabel(recipe.platform, lang);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 transition hover:border-slate-300 dark:hover:border-slate-700">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => onOpenRecipe(recipe)}
          className="block w-full h-full text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label={recipe.title}
        >
          <RecipeImage
            src={recipe.coverImage}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(recipe.id);
          }}
          aria-label={recipe.title}
          className={`absolute top-2.5 end-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl backdrop-blur-md transition ${
            recipe.isFavorite
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-black/45 text-white hover:bg-black/65'
          }`}
        >
          <Bookmark className="w-4 h-4" fill={recipe.isFavorite ? 'currentColor' : 'none'} />
        </button>

        <div className="pointer-events-none absolute bottom-2.5 start-3 end-3 flex items-center justify-between text-xs font-medium text-white">
          <span className="inline-flex items-center gap-1.5">
            <PlatformIcon platform={recipe.platform} className="w-3.5 h-3.5" />
            <span>{platName}</span>
          </span>
          <span className="font-mono tabular-nums text-[11px] bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-md">
            {formatTimestamp(recipe.videoDurationSec)} · {recipe.steps.length} {t.card.cues}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
          <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{recipe.creatorHandle}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 shrink-0 tabular-nums">
            <Clock className="w-3 h-3" />
            {totalMinutes}
            {t.card.minShort}
          </span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{t.difficulty[recipe.difficulty]}</span>
        </div>

        <button
          type="button"
          onClick={() => onOpenRecipe(recipe)}
          className="mt-1.5 text-start focus-visible:outline-none"
        >
          <h3 className="font-display text-base font-bold leading-snug text-slate-900 dark:text-white line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
            {recipe.title}
          </h3>
        </button>

        {recipe.videoTitle && recipe.videoTitle.trim().toLowerCase() !== recipe.title.trim().toLowerCase() && (
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            <span className="font-medium me-1">{t.card.originalVideoPrefix}</span>
            <span>{recipe.videoTitle}</span>
          </p>
        )}

        {transcriptMatchPreview ? (
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-lg px-2.5 py-1.5 line-clamp-2">
            <span className="font-mono font-semibold me-1.5">{formatTimestamp(transcriptMatchPreview.timestampSec)}</span>
            “{transcriptMatchPreview.text}”
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {recipe.summary}
          </p>
        )}

        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 truncate">
          {recipe.tags.slice(0, 4).join(' · ')}
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={() => onOpenRecipe(recipe)}
            className="min-h-[44px] flex-1 min-w-0 flex items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 transition whitespace-nowrap"
          >
            {t.card.cookAlong}
          </button>

          <button
            type="button"
            onClick={() => onOpenCollectionPicker(recipe.id)}
            aria-label={t.collections.saveToCollectionTitle}
            className="min-h-[44px] px-2.5 flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition whitespace-nowrap shrink-0"
          >
            <FolderPlus className="w-4 h-4 shrink-0" />
            <span className="tabular-nums">{collectionCount > 0 ? collectionCount : t.card.list}</span>
          </button>

          {onEditRecipe && (
            <button
              type="button"
              onClick={() => onEditRecipe(recipe)}
              aria-label={t.card.edit}
              title={t.card.edit}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shrink-0"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}

          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.card.watchOn(platName)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </article>
  );
};
