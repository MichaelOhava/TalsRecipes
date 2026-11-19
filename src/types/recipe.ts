export type SocialPlatform = 'instagram' | 'tiktok' | 'facebook' | 'youtube';

export interface Ingredient {
  id: string;
  item: string;
  amount: number | null;
  unit: string;
  note?: string;
}

export interface InstructionStep {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  linkedTimestampSec: number;
  durationSec?: number;
}

export interface TranscriptSegment {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
  linkedStepNumber?: number;
  prepCue?: string;
}

export interface Recipe {
  id: string;
  title: string;
  videoTitle?: string;
  platform: SocialPlatform;
  sourceUrl: string;
  creatorHandle: string;
  creatorName: string;
  coverImage: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Weekend';
  tags: string[];
  summary: string;
  ingredients: Ingredient[];
  steps: InstructionStep[];
  transcript: TranscriptSegment[];
  savedAt: string;
  isFavorite: boolean;
  isCustom?: boolean;
  videoDurationSec: number;
}

export type CollectionAccent = 'emerald' | 'blue' | 'amber' | 'rose' | 'violet';

export const COLLECTION_ACCENTS: CollectionAccent[] = [
  'emerald',
  'blue',
  'amber',
  'rose',
  'violet',
];

export const COLLECTION_ACCENT_DOT: Record<CollectionAccent, string> = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
};

export interface RecipeCollection {
  id: string;
  name: string;
  description: string;
  accent: CollectionAccent;
  recipeIds: string[];
  createdAt: string;
}

export type ActiveTab = 'discover' | 'collections' | 'saved' | 'settings';
export type Language = 'en' | 'he';
