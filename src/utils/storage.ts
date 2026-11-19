import { Recipe, RecipeCollection } from '../types/recipe';

const STORAGE_KEYS = {
  RECIPES: 'talsrecipes.v1.recipes',
  COLLECTIONS: 'talsrecipes.v1.collections',
  CHECKED_INGREDIENTS: 'talsrecipes.v1.checkedIngredients',
  THEME: 'talsrecipes.v1.theme',
  LANGUAGE: 'talsrecipes.v1.language',
} as const;

const VALID_PLATFORMS = new Set(['instagram', 'tiktok', 'facebook', 'youtube']);
const VALID_ACCENTS = new Set(['emerald', 'blue', 'amber', 'rose', 'violet']);
const VALID_DIFFICULTIES = new Set(['Easy', 'Medium', 'Weekend']);

function sanitizeRecipeRecord(raw: unknown, idx: number): Recipe | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === 'string' ? r.title.trim() : '';
  if (!title) return null;

  const platform =
    typeof r.platform === 'string' && VALID_PLATFORMS.has(r.platform)
      ? (r.platform as Recipe['platform'])
      : 'tiktok';

  const difficulty =
    typeof r.difficulty === 'string' && VALID_DIFFICULTIES.has(r.difficulty)
      ? (r.difficulty as Recipe['difficulty'])
      : 'Easy';

  const rawIngredients = Array.isArray(r.ingredients) ? r.ingredients : [];
  const ingredients = rawIngredients
    .map((item, ingIdx) => {
      if (!item || typeof item !== 'object') return null;
      const ing = item as Record<string, unknown>;
      const name = typeof ing.item === 'string' ? ing.item.trim() : '';
      if (!name) return null;
      return {
        id: typeof ing.id === 'string' && ing.id ? ing.id : `ing-${idx}-${ingIdx}`,
        item: name,
        amount: typeof ing.amount === 'number' && Number.isFinite(ing.amount) ? ing.amount : null,
        unit: typeof ing.unit === 'string' ? ing.unit : '',
        ...(typeof ing.note === 'string' && ing.note ? { note: ing.note } : {}),
      };
    })
    .filter((item): item is Recipe['ingredients'][number] => item !== null);

  const rawSteps = Array.isArray(r.steps) ? r.steps : [];
  const steps = rawSteps
    .map((item, stepIdx) => {
      if (!item || typeof item !== 'object') return null;
      const st = item as Record<string, unknown>;
      const instruction = typeof st.instruction === 'string' ? st.instruction.trim() : '';
      if (!instruction) return null;
      return {
        id: typeof st.id === 'string' && st.id ? st.id : `step-${idx}-${stepIdx}`,
        stepNumber:
          typeof st.stepNumber === 'number' && Number.isFinite(st.stepNumber)
            ? st.stepNumber
            : stepIdx + 1,
        title: typeof st.title === 'string' && st.title ? st.title : `Step ${stepIdx + 1}`,
        instruction,
        linkedTimestampSec:
          typeof st.linkedTimestampSec === 'number' && Number.isFinite(st.linkedTimestampSec)
            ? Math.max(0, st.linkedTimestampSec)
            : stepIdx * 12,
        ...(typeof st.durationSec === 'number' && Number.isFinite(st.durationSec) && st.durationSec > 0
          ? { durationSec: st.durationSec }
          : {}),
      };
    })
    .filter((item): item is Recipe['steps'][number] => item !== null);

  const rawTranscript = Array.isArray(r.transcript) ? r.transcript : [];
  const transcript = rawTranscript
    .map((item, trIdx) => {
      if (!item || typeof item !== 'object') return null;
      const tr = item as Record<string, unknown>;
      const text = typeof tr.text === 'string' ? tr.text.trim() : '';
      if (!text) return null;
      const startSec =
        typeof tr.startSec === 'number' && Number.isFinite(tr.startSec)
          ? Math.max(0, tr.startSec)
          : trIdx * 12;
      const endSec =
        typeof tr.endSec === 'number' && Number.isFinite(tr.endSec)
          ? Math.max(startSec + 1, tr.endSec)
          : startSec + 10;
      return {
        id: typeof tr.id === 'string' && tr.id ? tr.id : `tr-${idx}-${trIdx}`,
        startSec,
        endSec,
        text,
        ...(typeof tr.linkedStepNumber === 'number' ? { linkedStepNumber: tr.linkedStepNumber } : {}),
        ...(typeof tr.prepCue === 'string' ? { prepCue: tr.prepCue } : {}),
      };
    })
    .filter((item): item is Recipe['transcript'][number] => item !== null);

  const tags = Array.isArray(r.tags)
    ? r.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : [];

  return {
    id: typeof r.id === 'string' && r.id.trim() ? r.id.trim() : `rec-restored-${Date.now()}-${idx}`,
    title,
    ...(typeof r.videoTitle === 'string' && r.videoTitle.trim() ? { videoTitle: r.videoTitle.trim() } : {}),
    platform,
    sourceUrl: typeof r.sourceUrl === 'string' ? r.sourceUrl : '',
    creatorHandle: typeof r.creatorHandle === 'string' && r.creatorHandle ? r.creatorHandle : '@creator',
    creatorName: typeof r.creatorName === 'string' && r.creatorName ? r.creatorName : 'Creator',
    coverImage: typeof r.coverImage === 'string' ? r.coverImage : '',
    prepMinutes:
      typeof r.prepMinutes === 'number' && Number.isFinite(r.prepMinutes) ? Math.max(0, r.prepMinutes) : 10,
    cookMinutes:
      typeof r.cookMinutes === 'number' && Number.isFinite(r.cookMinutes) ? Math.max(0, r.cookMinutes) : 10,
    servings:
      typeof r.servings === 'number' && Number.isFinite(r.servings) ? Math.max(1, r.servings) : 2,
    difficulty,
    tags,
    summary: typeof r.summary === 'string' ? r.summary : '',
    ingredients,
    steps,
    transcript,
    savedAt: typeof r.savedAt === 'string' && r.savedAt ? r.savedAt : new Date().toISOString(),
    isFavorite: Boolean(r.isFavorite),
    isCustom: typeof r.isCustom === 'boolean' ? r.isCustom : true,
    videoDurationSec:
      typeof r.videoDurationSec === 'number' && Number.isFinite(r.videoDurationSec)
        ? Math.max(10, r.videoDurationSec)
        : 30,
  };
}

function sanitizeCollectionRecord(raw: unknown, idx: number): RecipeCollection | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  const name = typeof c.name === 'string' ? c.name.trim() : '';
  if (!name) return null;

  return {
    id: typeof c.id === 'string' && c.id.trim() ? c.id.trim() : `col-restored-${Date.now()}-${idx}`,
    name,
    description: typeof c.description === 'string' ? c.description : '',
    accent:
      typeof c.accent === 'string' && VALID_ACCENTS.has(c.accent)
        ? (c.accent as RecipeCollection['accent'])
        : 'emerald',
    recipeIds: Array.isArray(c.recipeIds)
      ? c.recipeIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : [],
    createdAt: typeof c.createdAt === 'string' && c.createdAt ? c.createdAt : new Date().toISOString(),
  };
}

export function sanitizeImportedBackup(raw: unknown): {
  recipes: Recipe[];
  collections: RecipeCollection[];
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.recipes) || !Array.isArray(obj.collections)) return null;

  const recipes = obj.recipes
    .map((item, idx) => sanitizeRecipeRecord(item, idx))
    .filter((item): item is Recipe => item !== null);
  const collections = obj.collections
    .map((item, idx) => sanitizeCollectionRecord(item, idx))
    .filter((item): item is RecipeCollection => item !== null);

  return { recipes, collections };
}

export function loadLanguage(): 'en' | 'he' {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    if (saved === 'he' || saved === 'en') return saved;
  } catch {
    // Ignore
  }
  return 'en';
}

export function saveLanguage(lang: 'en' | 'he'): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  } catch {
    // Ignore
  }
}

export function loadRecipes(): Recipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECIPES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, idx) => sanitizeRecipeRecord(item, idx))
      .filter((item): item is Recipe => item !== null);
  } catch {
    return [];
  }
}

export function saveRecipes(recipes: Recipe[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadCollections(): RecipeCollection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, idx) => sanitizeCollectionRecord(item, idx))
      .filter((item): item is RecipeCollection => item !== null);
  } catch {
    return [];
  }
}

export function saveCollections(collections: RecipeCollection[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadCheckedIngredients(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHECKED_INGREDIENTS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const sanitized: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (Array.isArray(v)) {
        sanitized[k] = v.filter((id): id is string => typeof id === 'string');
      }
    }
    return sanitized;
  } catch {
    return {};
  }
}

export function saveCheckedIngredients(map: Record<string, string[]>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CHECKED_INGREDIENTS, JSON.stringify(map));
  } catch {
    // Ignore
  }
}

export function loadTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // Ignore
  }
  return 'light';
}

export function saveTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch {
    // Ignore
  }
}

export function clearLibraryData(): { recipes: Recipe[]; collections: RecipeCollection[] } {
  localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify([]));
  localStorage.removeItem(STORAGE_KEYS.CHECKED_INGREDIENTS);
  return { recipes: [], collections: [] };
}
