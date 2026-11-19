import React, { useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Download,
  Languages,
  Moon,
  RotateCcw,
  Smartphone,
  Sun,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getCopy } from '../i18n/translations';
import { Language, Recipe, RecipeCollection } from '../types/recipe';
import { sanitizeImportedBackup } from '../utils/storage';
import { PWAInstallButton } from './PWAInstallButton';
import { RecipeCard } from './RecipeCard';
import { RecipeSearchBar, RecipeSearchEmpty } from './RecipeSearchBar';

interface SavedViewProps {
  lang: Language;
  recipes: Recipe[];
  collections: RecipeCollection[];
  onOpenRecipe: (recipe: Recipe) => void;
  onToggleFavorite: (recipeId: string) => void;
  onOpenCollectionPicker: (recipeId: string) => void;
  onEditRecipe: (recipe: Recipe) => void;
}

export const SavedView: React.FC<SavedViewProps> = ({
  lang,
  recipes,
  collections,
  onOpenRecipe,
  onToggleFavorite,
  onOpenCollectionPicker,
  onEditRecipe,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const t = getCopy(lang);
  const savedRecipes = useMemo(() => recipes.filter((r) => r.isFavorite), [recipes]);
  const filteredSaved = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return savedRecipes;
    return savedRecipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        Boolean(r.videoTitle && r.videoTitle.toLowerCase().includes(q)) ||
        r.creatorHandle.toLowerCase().includes(q) ||
        r.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        r.ingredients.some((i) => i.item.toLowerCase().includes(q)) ||
        r.transcript.some((seg) => seg.text.toLowerCase().includes(q))
    );
  }, [savedRecipes, searchQuery]);
  const getCollectionCount = (recipeId: string) =>
    collections.filter((c) => c.recipeIds.includes(recipeId)).length;

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t.saved.heading}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t.saved.subtitle}
        </p>
      </div>

      {savedRecipes.length > 0 && (
        <RecipeSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t.discover.searchPlaceholder}
          clearAriaLabel={t.discover.clearFilters}
          minHeightClass="min-h-[46px]"
        />
      )}

      {savedRecipes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
          <Bookmark className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t.saved.emptyTitle}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t.saved.emptyBody}
          </p>
        </div>
      ) : filteredSaved.length === 0 ? (
        <RecipeSearchEmpty title={t.discover.noMatchesTitle} body={t.discover.noMatchesBody} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSaved.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              lang={lang}
              recipe={recipe}
              collectionCount={getCollectionCount(recipe.id)}
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

interface SettingsViewProps {
  lang: Language;
  onChangeLang: (next: Language) => void;
  recipes: Recipe[];
  collections: RecipeCollection[];
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onImportBackup: (recipes: Recipe[], collections: RecipeCollection[]) => void;
  onResetLibrary: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  lang,
  onChangeLang,
  recipes,
  collections,
  theme,
  onToggleTheme,
  onImportBackup,
  onResetLibrary,
}) => {
  const isOnline = useOnlineStatus();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const t = getCopy(lang);

  const handleExport = () => {
    const payload = JSON.stringify(
      {
        app: "Tal's Recipes",
        exportedAt: new Date().toISOString(),
        recipes,
        collections,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tals-recipes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage(t.settings.exportedMsg);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const sanitized = sanitizeImportedBackup(parsed);
        if (sanitized) {
          onImportBackup(sanitized.recipes, sanitized.collections);
          setStatusMessage(
            t.settings.importedMsg(sanitized.recipes.length, sanitized.collections.length)
          );
        } else {
          setStatusMessage(t.settings.invalidFileMsg);
        }
      } catch {
        setStatusMessage(t.settings.unreadableFileMsg);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-2xl space-y-6 pb-24 md:pb-12">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t.settings.heading}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t.settings.subtitle}
        </p>
      </div>

      {/* Language Switcher */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              {t.settings.languageTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.settings.languageDesc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => onChangeLang('en')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold transition ${
              lang === 'en'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onChangeLang('he')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold transition ${
              lang === 'he'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            עברית
          </button>
        </div>
      </section>

      {/* PWA Installation & Status */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              {t.settings.installTitle}
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              {t.settings.installDesc}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5 font-medium">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.settings.online}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>{t.settings.offline}</span>
              </>
            )}
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{t.settings.recipesCached(recipes.length)}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{t.settings.collectionsCount(collections.length)}</span>
        </div>

        <PWAInstallButton lang={lang} variant="full" alwaysShowGuideOption />
      </section>

      {/* Appearance */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            {t.settings.themeTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.settings.themeDesc}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition shrink-0"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-500" />
              <span>{t.settings.lightMode}</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-600" />
              <span>{t.settings.darkMode}</span>
            </>
          )}
        </button>
      </section>

      {/* Library Backup */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            {t.settings.backupTitle}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t.settings.backupDesc}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Download className="w-4 h-4" />
            <span>{t.settings.exportJson}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Upload className="w-4 h-4" />
            <span>{t.settings.importJson}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => {
              onResetLibrary();
              setStatusMessage(t.settings.clearedMsg);
            }}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.settings.clearData}</span>
          </button>
        </div>

        {statusMessage && (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {statusMessage}
          </p>
        )}
      </section>
    </div>
  );
};
