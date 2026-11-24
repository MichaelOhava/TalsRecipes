import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Compass,
  FolderHeart,
  Moon,
  Plus,
  Smartphone,
  Sun,
} from 'lucide-react';
import { CollectionPickerModal } from './components/CollectionPickerModal';
import { CollectionsView } from './components/CollectionsView';
import { DiscoverView } from './components/DiscoverView';
import { ImportRecipeModal, SharedIncomingPayload } from './components/ImportRecipeModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { RecipeDetailView } from './components/RecipeDetailView';
import { SavedView, SettingsView } from './components/SavedAndSettingsView';
import { getCopy } from './i18n/translations';
import { ActiveTab, CollectionAccent, Language, Recipe, RecipeCollection } from './types/recipe';
import {
  clearLibraryData,
  loadCheckedIngredients,
  loadCollections,
  loadLanguage,
  loadRecipes,
  loadTheme,
  saveCheckedIngredients,
  saveCollections,
  saveLanguage,
  saveRecipes,
  saveTheme,
} from './utils/storage';
import { createIncomingShareDraft, parseIncomingShare } from './utils/incomingShare';
import { normalizeSocialUrl } from './utils/socialExtractor';

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>(() => loadRecipes());
  const [collections, setCollections] = useState<RecipeCollection[]>(() => loadCollections());
  const [checkedMap, setCheckedMap] = useState<Record<string, string[]>>(() => loadCheckedIngredients());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());
  const [lang, setLang] = useState<Language>(() => loadLanguage());

  const [activeTab, setActiveTab] = useState<ActiveTab>('discover');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string>('all');
  const [collectionPickerRecipeId, setCollectionPickerRecipeId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [sharedPayload, setSharedPayload] = useState<SharedIncomingPayload | null>(null);
  const [collectionsResetCount, setCollectionsResetCount] = useState(0);
  const recipesRef = useRef(recipes);
  const langRef = useRef(lang);
  recipesRef.current = recipes;
  langRef.current = lang;

  const t = getCopy(lang);

  const readIncomingShare = () => {
    const incomingShare = parseIncomingShare(window.location.href);
    if (incomingShare) {
      const sourceUrl = incomingShare.url ? normalizeSocialUrl(incomingShare.url) : undefined;
      const sharedPayload = { ...incomingShare, url: sourceUrl };
      const existingRecipe = sourceUrl
        ? recipesRef.current.find((recipe) => normalizeSocialUrl(recipe.sourceUrl) === sourceUrl)
        : undefined;
      const draft = existingRecipe || createIncomingShareDraft(sharedPayload, langRef.current);

      if (draft && !existingRecipe) {
        setRecipes((current) => [draft, ...current]);
      }
      setEditingRecipe(draft);
      setSharedPayload({
        url: sourceUrl,
        text: incomingShare.text,
        title: incomingShare.title,
      });
      setIsImportModalOpen(true);

      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // Sync HTML dir/lang for native RTL Hebrew & LTR English
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.title = lang === 'he' ? "המתכונים של טל — Tal's Recipes" : "Tal's Recipes";
    saveLanguage(lang);
  }, [lang]);

  // Handle incoming PWA Share Target query parameters
  useEffect(() => {
    readIncomingShare();
    window.addEventListener('focus', readIncomingShare);
    window.addEventListener('popstate', readIncomingShare);
    return () => {
      window.removeEventListener('focus', readIncomingShare);
      window.removeEventListener('popstate', readIncomingShare);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    saveRecipes(recipes);
  }, [recipes]);

  useEffect(() => {
    saveCollections(collections);
  }, [collections]);

  useEffect(() => {
    saveCheckedIngredients(checkedMap);
  }, [checkedMap]);

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) || null;
  const pickerRecipe = recipes.find((r) => r.id === collectionPickerRecipeId) || null;

  const handleToggleFavorite = (recipeId: string) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, isFavorite: !r.isFavorite } : r))
    );
  };

  const handleToggleIngredient = (recipeId: string, ingredientId: string) => {
    setCheckedMap((prev) => {
      const current = prev[recipeId] || [];
      const next = current.includes(ingredientId)
        ? current.filter((id) => id !== ingredientId)
        : [...current, ingredientId];
      return { ...prev, [recipeId]: next };
    });
  };

  const handleClearCheckedIngredients = (recipeId: string) => {
    setCheckedMap((prev) => ({ ...prev, [recipeId]: [] }));
  };

  const handleToggleRecipeInCollection = (collectionId: string, recipeId: string) => {
    setCollections((prev) =>
      prev.map((col) => {
        if (col.id !== collectionId) return col;
        const exists = col.recipeIds.includes(recipeId);
        return {
          ...col,
          recipeIds: exists
            ? col.recipeIds.filter((id) => id !== recipeId)
            : [...col.recipeIds, recipeId],
        };
      })
    );
  };

  const handleCreateCollection = (
    name: string,
    description: string,
    accent: CollectionAccent,
    initialRecipeId?: string
  ) => {
    const newCol: RecipeCollection = {
      id: `col-${Date.now()}`,
      name,
      description,
      accent,
      recipeIds: initialRecipeId ? [initialRecipeId] : [],
      createdAt: new Date().toISOString(),
    };
    setCollections((prev) => [newCol, ...prev]);
  };

  const handleDeleteCollection = (collectionId: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== collectionId));
  };

  const handleOpenImportNew = () => {
    setEditingRecipe(null);
    setIsImportModalOpen(true);
  };

  const handleOpenEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsImportModalOpen(true);
  };

  const handleSaveRecipe = (savedRecipe: Recipe) => {
    const exists = recipes.some((r) => r.id === savedRecipe.id);
    if (exists) {
      setRecipes((prev) => prev.map((r) => (r.id === savedRecipe.id ? savedRecipe : r)));
    } else {
      setRecipes((prev) => [savedRecipe, ...prev]);
      setSelectedRecipeId(savedRecipe.id);
      setActiveTab('discover');
    }
    setEditingRecipe(null);
  };

  const handleDeleteRecipe = (recipeId: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    setCollections((prev) =>
      prev.map((c) => ({ ...c, recipeIds: c.recipeIds.filter((id) => id !== recipeId) }))
    );
    setCheckedMap((prev) => {
      if (!(recipeId in prev)) return prev;
      const next = { ...prev };
      delete next[recipeId];
      return next;
    });
    if (selectedRecipeId === recipeId) {
      setSelectedRecipeId(null);
    }
  };

  const handleNavigateTab = (tab: ActiveTab) => {
    setSelectedRecipeId(null);
    setActiveTab(tab);
    if (tab === 'collections') {
      setCollectionsResetCount((c) => c + 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#F5F6F8] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop 3-Zone Top Bar & Mobile Header */}
      <header className="sticky top-0 z-30 h-14 md:h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 pt-safe">
        <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 md:gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleNavigateTab('discover')}
            className="min-w-0 font-display text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap flex items-center gap-2"
          >
            <img
              src={`${import.meta.env.BASE_URL}pwa-192x192.png`}
              alt={t.brandName}
              className="w-8 h-8 rounded-xl object-cover shadow-sm ring-1 ring-amber-400/40 shrink-0"
            />
            <span className="truncate">{t.brandName}</span>
          </button>

          {/* Zone 2: Clean Single-Line Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            {(
              [
                ['discover', t.nav.discover],
                ['collections', t.nav.collections],
                ['saved', t.nav.saved],
                ['settings', t.nav.app],
              ] as Array<[ActiveTab, string]>
            ).map(([tab, label]) => {
              const active = !selectedRecipe && activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleNavigateTab(tab)}
                  className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                    active
                      ? 'text-slate-900 dark:text-white font-semibold border-emerald-600'
                      : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Language toggle, Theme & Primary CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setLang((l) => (l === 'en' ? 'he' : 'en'))}
              aria-label="Switch language English / Hebrew"
              className="min-h-[44px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap shrink-0"
            >
              {lang === 'en' ? 'עברית' : 'EN'}
            </button>

            <PWAInstallButton lang={lang} variant="compact" />

            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? t.settings.lightMode : t.settings.darkMode}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleOpenImportNew}
              className="hidden md:inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 transition whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t.nav.saveRecipe}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7">
        {selectedRecipe ? (
          <RecipeDetailView
            lang={lang}
            recipe={selectedRecipe}
            checkedIngredientIds={checkedMap[selectedRecipe.id] || []}
            collectionNames={collections
              .filter((c) => c.recipeIds.includes(selectedRecipe.id))
              .map((c) => c.name)}
            onBack={() => setSelectedRecipeId(null)}
            onToggleFavorite={handleToggleFavorite}
            onToggleIngredient={handleToggleIngredient}
            onClearCheckedIngredients={handleClearCheckedIngredients}
            onOpenCollectionPicker={(id) => setCollectionPickerRecipeId(id)}
            onSelectTag={(tag) => {
              setSelectedRecipeId(null);
              setActiveTab('discover');
              setActiveTag(tag);
            }}
            onEditRecipe={handleOpenEditRecipe}
            onDeleteRecipe={handleDeleteRecipe}
          />
        ) : activeTab === 'discover' ? (
          <DiscoverView
            lang={lang}
            recipes={recipes}
            collections={collections}
            activeTag={activeTag}
            onActiveTagChange={setActiveTag}
            onOpenRecipe={(r) => setSelectedRecipeId(r.id)}
            onToggleFavorite={handleToggleFavorite}
            onOpenCollectionPicker={(id) => setCollectionPickerRecipeId(id)}
            onOpenImportModal={handleOpenImportNew}
            onEditRecipe={handleOpenEditRecipe}
          />
        ) : activeTab === 'collections' ? (
          <CollectionsView
            lang={lang}
            collections={collections}
            recipes={recipes}
            resetSignal={collectionsResetCount}
            onCreateCollection={(name, desc, accent) => handleCreateCollection(name, desc, accent)}
            onDeleteCollection={handleDeleteCollection}
            onRemoveRecipeFromCollection={handleToggleRecipeInCollection}
            onOpenRecipe={(r) => setSelectedRecipeId(r.id)}
            onToggleFavorite={handleToggleFavorite}
            onOpenCollectionPicker={(id) => setCollectionPickerRecipeId(id)}
            onEditRecipe={handleOpenEditRecipe}
          />
        ) : activeTab === 'saved' ? (
          <SavedView
            lang={lang}
            recipes={recipes}
            collections={collections}
            onOpenRecipe={(r) => setSelectedRecipeId(r.id)}
            onToggleFavorite={handleToggleFavorite}
            onOpenCollectionPicker={(id) => setCollectionPickerRecipeId(id)}
            onEditRecipe={handleOpenEditRecipe}
          />
        ) : (
          <SettingsView
            lang={lang}
            onChangeLang={setLang}
            recipes={recipes}
            collections={collections}
            theme={theme}
            onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            onImportBackup={(nextRecipes, nextCols) => {
              setRecipes(nextRecipes);
              setCollections(nextCols);
            }}
            onResetLibrary={() => {
              const cleared = clearLibraryData();
              setRecipes(cleared.recipes);
              setCollections(cleared.collections);
              setCheckedMap({});
            }}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Thumb-Zone Tab Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-16">
          <button
            type="button"
            onClick={() => handleNavigateTab('discover')}
            className={`min-h-[44px] flex flex-col items-center justify-center ${
              !selectedRecipe && activeTab === 'discover'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[10px] font-semibold tracking-tight mt-1">{t.nav.discover}</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigateTab('collections')}
            className={`min-h-[44px] flex flex-col items-center justify-center ${
              !selectedRecipe && activeTab === 'collections'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <FolderHeart className="w-5 h-5" />
            <span className="text-[10px] font-semibold tracking-tight mt-1">{t.nav.collections}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenImportNew}
            aria-label={t.nav.saveRecipe}
            className="min-h-[44px] flex flex-col items-center justify-center"
          >
            <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Plus className="w-5 h-5" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigateTab('saved')}
            className={`min-h-[44px] flex flex-col items-center justify-center ${
              !selectedRecipe && activeTab === 'saved'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Bookmark className="w-5 h-5" />
            <span className="text-[10px] font-semibold tracking-tight mt-1">{t.nav.saved}</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigateTab('settings')}
            className={`min-h-[44px] flex flex-col items-center justify-center ${
              !selectedRecipe && activeTab === 'settings'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span className="text-[10px] font-semibold tracking-tight mt-1">{t.nav.appShort}</span>
          </button>
        </div>
      </nav>

      <CollectionPickerModal
        lang={lang}
        recipe={pickerRecipe}
        collections={collections}
        onClose={() => setCollectionPickerRecipeId(null)}
        onToggleRecipeInCollection={handleToggleRecipeInCollection}
        onCreateCollection={handleCreateCollection}
      />

      <ImportRecipeModal
        lang={lang}
        isOpen={isImportModalOpen}
        editingRecipe={editingRecipe}
        initialShared={sharedPayload}
        onClose={() => {
          setIsImportModalOpen(false);
          setEditingRecipe(null);
          setSharedPayload(null);
        }}
        onSaveRecipe={handleSaveRecipe}
        onDeleteRecipe={handleDeleteRecipe}
      />

      <OfflineIndicator lang={lang} />
    </div>
  );
}
