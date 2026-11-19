import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Check,
  ClipboardList,
  Clock,
  ExternalLink,
  FolderPlus,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Share2,
  SkipBack,
  SkipForward,
  Timer,
  Trash2,
} from 'lucide-react';
import { getCopy } from '../i18n/translations';
import { Language, Recipe } from '../types/recipe';
import {
  formatPlatformLabel,
  formatScaledAmount,
  formatShoppingListText,
  formatTimestamp,
} from '../utils/recipeParser';
import { PlatformIcon, RecipeImage } from './PlatformIcon';

interface RecipeDetailViewProps {
  lang: Language;
  recipe: Recipe;
  checkedIngredientIds: string[];
  collectionNames: string[];
  onBack: () => void;
  onToggleFavorite: (recipeId: string) => void;
  onToggleIngredient: (recipeId: string, ingredientId: string) => void;
  onClearCheckedIngredients: (recipeId: string) => void;
  onOpenCollectionPicker: (recipeId: string) => void;
  onSelectTag: (tag: string) => void;
  onEditRecipe?: (recipe: Recipe) => void;
  onDeleteRecipe?: (recipeId: string) => void;
}

function playTimerChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.65);
  } catch {
    // Optional
  }
}

export const RecipeDetailView: React.FC<RecipeDetailViewProps> = ({
  lang,
  recipe,
  checkedIngredientIds,
  collectionNames,
  onBack,
  onToggleFavorite,
  onToggleIngredient,
  onClearCheckedIngredients,
  onOpenCollectionPicker,
  onSelectTag,
  onEditRecipe,
  onDeleteRecipe,
}) => {
  const [servings, setServings] = useState(recipe.servings);
  const [currentSec, setCurrentSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStepNumber, setActiveStepNumber] = useState<number>(1);
  const [mobilePanel, setMobilePanel] = useState<'steps' | 'transcript'>('steps');

  const [timerStepId, setTimerStepId] = useState<string | null>(null);
  const [timerRemainingSec, setTimerRemainingSec] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  const [copiedFeedback, setCopiedFeedback] = useState<{
    kind: 'copied' | 'shared' | 'sharedCopied';
    count: number;
    wasCheckedSubset: boolean;
  } | null>(null);
  const [manualCopyText, setManualCopyText] = useState<string | null>(null);

  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const transcriptRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const copyTimerRef = useRef<number | null>(null);

  const t = getCopy(lang);
  const platName = formatPlatformLabel(recipe.platform, lang);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setServings(recipe.servings);
    setCurrentSec(0);
    setIsPlaying(false);
    setActiveStepNumber(1);
    setTimerStepId(null);
    setTimerRemainingSec(0);
    setTimerRunning(false);
    setCopiedFeedback(null);
    setManualCopyText(null);
  }, [recipe.id, recipe.servings]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      setCurrentSec((prev) => {
        if (prev >= recipe.videoDurationSec) {
          setIsPlaying(false);
          return recipe.videoDurationSec;
        }
        return prev + 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPlaying, recipe.videoDurationSec]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setTimerRemainingSec((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          playTimerChime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const activeTranscriptSegment = useMemo(() => {
    return (
      recipe.transcript.find(
        (seg) => currentSec >= seg.startSec && currentSec <= seg.endSec
      ) ||
      recipe.transcript[0] ||
      null
    );
  }, [recipe.transcript, currentSec]);

  useEffect(() => {
    if (activeTranscriptSegment?.linkedStepNumber) {
      setActiveStepNumber(activeTranscriptSegment.linkedStepNumber);
    }
  }, [activeTranscriptSegment]);

  const scaleFactor = servings / Math.max(1, recipe.servings);
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;

  const jumpToStep = (stepNumber: number, timestampSec: number, switchMobileToTranscript = false) => {
    setActiveStepNumber(stepNumber);
    setCurrentSec(timestampSec);
    if (switchMobileToTranscript) {
      setMobilePanel('transcript');
    }
    const matchingSeg = recipe.transcript.find(
      (s) => s.linkedStepNumber === stepNumber || (timestampSec >= s.startSec && timestampSec <= s.endSec)
    );
    if (matchingSeg) {
      window.setTimeout(() => {
        transcriptRefs.current[matchingSeg.id]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 60);
    }
  };

  const jumpFromTranscript = (segStartSec: number, linkedStep?: number) => {
    setCurrentSec(segStartSec);
    if (linkedStep) {
      setActiveStepNumber(linkedStep);
      if (window.innerWidth < 1024) {
        setMobilePanel('steps');
      }
      window.setTimeout(() => {
        stepRefs.current[linkedStep]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 60);
    }
  };

  const stepJumpNeighbor = (dir: -1 | 1) => {
    const sorted = [...recipe.steps].sort((a, b) => a.stepNumber - b.stepNumber);
    const idx = sorted.findIndex((s) => s.stepNumber === activeStepNumber);
    const nextIdx = Math.max(0, Math.min(sorted.length - 1, (idx === -1 ? 0 : idx) + dir));
    const target = sorted[nextIdx];
    if (target) {
      jumpToStep(target.stepNumber, target.linkedTimestampSec);
    }
  };

  const toggleStepTimer = (stepId: string, durationSec: number) => {
    if (timerStepId === stepId) {
      setTimerRunning((r) => !r);
    } else {
      setTimerStepId(stepId);
      setTimerRemainingSec(durationSec);
      setTimerRunning(true);
    }
  };

  const checkedCount = recipe.ingredients.filter((ing) =>
    checkedIngredientIds.includes(ing.id)
  ).length;
  const exportCount = checkedCount > 0 ? checkedCount : recipe.ingredients.length;

  const scheduleFeedbackClear = () => {
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopiedFeedback(null);
    }, 2800);
  };

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    let copied = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied && typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        copied = false;
      }
    }
    return copied;
  };

  const handleCopyShoppingList = async () => {
    const shoppingText = formatShoppingListText(recipe, checkedIngredientIds, servings, lang);
    if (!shoppingText) return;

    const copied = await copyTextToClipboard(shoppingText);
    if (copied) {
      setManualCopyText(null);
      setCopiedFeedback({
        kind: 'copied',
        count: exportCount,
        wasCheckedSubset: checkedCount > 0,
      });
      scheduleFeedbackClear();
    } else {
      setCopiedFeedback(null);
      setManualCopyText(shoppingText);
    }
  };

  const handleShareShoppingList = async () => {
    const shoppingText = formatShoppingListText(recipe, checkedIngredientIds, servings, lang);
    if (!shoppingText) return;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: t.detail.shoppingListShareTitle(recipe.title),
          text: shoppingText,
        });
        setManualCopyText(null);
        setCopiedFeedback({
          kind: 'shared',
          count: exportCount,
          wasCheckedSubset: checkedCount > 0,
        });
        scheduleFeedbackClear();
        return;
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') {
          return;
        }
      }
    }

    // Fallback when native OS share sheet is unavailable (e.g. embedded preview or desktop browser)
    const copied = await copyTextToClipboard(shoppingText);
    if (copied) {
      setManualCopyText(null);
      setCopiedFeedback({
        kind: 'sharedCopied',
        count: exportCount,
        wasCheckedSubset: checkedCount > 0,
      });
      scheduleFeedbackClear();
    } else {
      setCopiedFeedback(null);
      setManualCopyText(shoppingText);
    }
  };

  return (
    <div className="pb-24 md:pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] inline-flex items-center gap-2 rounded-xl px-3 -ms-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t.detail.allRecipes}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white px-4 text-xs font-semibold text-white dark:text-slate-900 hover:opacity-90 transition whitespace-nowrap"
          >
            <PlatformIcon platform={recipe.platform} className="w-3.5 h-3.5" />
            <span>{t.detail.watchOn(platName)}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>

          <button
            type="button"
            onClick={() => onOpenCollectionPicker(recipe.id)}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition whitespace-nowrap"
          >
            <FolderPlus className="w-4 h-4" />
            <span>
              {collectionNames.length > 0 ? t.detail.savedInCols(collectionNames.length) : t.detail.collect}
            </span>
          </button>

          {onEditRecipe && (
            <button
              type="button"
              onClick={() => onEditRecipe(recipe)}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition whitespace-nowrap"
            >
              <Pencil className="w-4 h-4" />
              <span>{t.detail.editRecipe}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onToggleFavorite(recipe.id)}
            aria-label={recipe.title}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition ${
              recipe.isFavorite
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className="w-4 h-4" fill={recipe.isFavorite ? 'currentColor' : 'none'} />
          </button>

          {onDeleteRecipe && (
            <button
              type="button"
              onClick={() => onDeleteRecipe(recipe.id)}
              aria-label={t.detail.deleteRecipe}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Hero Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 space-y-4">
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              <RecipeImage
                src={recipe.coverImage}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

              {activeTranscriptSegment && (
                <div className="absolute bottom-3 start-3 end-3 rounded-xl bg-black/70 backdrop-blur-md p-3 text-white">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-emerald-300 mb-1" dir="ltr">
                    <span>
                      {formatTimestamp(activeTranscriptSegment.startSec)} – {formatTimestamp(activeTranscriptSegment.endSec)}
                    </span>
                    {activeTranscriptSegment.linkedStepNumber && (
                      <span className="font-sans font-semibold text-white">
                        {t.detail.stepLabel(activeTranscriptSegment.linkedStepNumber)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm leading-snug text-white/95 line-clamp-2">
                    “{activeTranscriptSegment.text}”
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition"
                    aria-label={isPlaying ? t.detail.pause : t.detail.resume}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ms-0.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => stepJumpNeighbor(-1)}
                    aria-label="Previous step"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <SkipBack className="w-4 h-4 rtl:rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepJumpNeighbor(1)}
                    aria-label="Next step"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <SkipForward className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </div>

                <div className="text-end">
                  <div className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white" dir="ltr">
                    {formatTimestamp(currentSec)} / {formatTimestamp(recipe.videoDurationSec)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t.detail.syncedTimeline}
                  </div>
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={recipe.videoDurationSec}
                value={currentSec}
                onChange={(e) => setCurrentSec(Number(e.target.value))}
                aria-label={t.detail.syncedTimeline}
                className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
              />

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                {recipe.steps.map((step) => {
                  const active = activeStepNumber === step.stepNumber;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => jumpToStep(step.stepNumber, step.linkedTimestampSec)}
                      className={`min-h-[38px] px-2.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition flex items-center gap-1.5 ${
                        active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{t.detail.stepLabel(step.stepNumber)}</span>
                      <span className="font-mono text-[11px] opacity-85 tabular-nums" dir="ltr">
                        {formatTimestamp(step.linkedTimestampSec)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Overview + Ingredients */}
        <div className="lg:col-span-6 space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                <PlatformIcon platform={recipe.platform} className="w-3.5 h-3.5" />
                {platName}
              </span>
              <span aria-hidden="true">·</span>
              <span>{recipe.creatorHandle}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                {t.detail.totalMin(totalMinutes)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{t.difficulty[recipe.difficulty]}</span>
            </div>

            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
              {recipe.title}
            </h1>

            {recipe.videoTitle && recipe.videoTitle.trim().toLowerCase() !== recipe.title.trim().toLowerCase() && (
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-600 dark:text-slate-300 me-1">
                  {t.detail.originalVideoLabel}
                </span>
                <span>{recipe.videoTitle}</span>
              </p>
            )}

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {recipe.summary}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {recipe.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onSelectTag(tag)}
                  className="min-h-[34px] px-2.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-800 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 transition whitespace-nowrap"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  {t.detail.ingredients}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {t.detail.preppedCount(checkedIngredientIds.length, recipe.ingredients.length)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70">
                  <button
                    type="button"
                    onClick={() => setServings((s) => Math.max(1, s - 1))}
                    aria-label="Decrease servings"
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-emerald-600"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-xs font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                    {servings} {servings === 1 ? t.detail.servingSingle : t.detail.servingPlural}
                  </span>
                  <button
                    type="button"
                    onClick={() => setServings((s) => Math.min(24, s + 1))}
                    aria-label="Increase servings"
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-emerald-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {checkedIngredientIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onClearCheckedIngredients(recipe.id)}
                    className="min-h-[40px] px-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    {t.detail.reset}
                  </button>
                )}
              </div>
            </div>

            <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-1">
              {recipe.ingredients.map((ing) => {
                const checked = checkedIngredientIds.includes(ing.id);
                const qtyLabel = formatScaledAmount(ing.amount, scaleFactor);
                return (
                  <li key={ing.id}>
                    <button
                      type="button"
                      onClick={() => onToggleIngredient(recipe.id, ing.id)}
                      className="w-full min-h-[48px] py-2.5 flex items-center gap-3 text-start group"
                    >
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition ${
                          checked
                            ? 'bg-emerald-600 text-white'
                            : 'border border-slate-300 dark:border-slate-600 group-hover:border-emerald-500'
                        }`}
                      >
                        {checked && <Check className="w-3.5 h-3.5" />}
                      </span>
                      <span
                        className={`text-sm flex-1 transition ${
                          checked
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {qtyLabel && (
                          <span className="font-mono font-semibold tabular-nums me-1.5 text-slate-900 dark:text-white">
                            {qtyLabel}
                            {ing.unit ? ` ${ing.unit}` : ''}
                          </span>
                        )}
                        {!qtyLabel && ing.unit && (
                          <span className="font-medium me-1.5">{ing.unit}</span>
                        )}
                        <span>{ing.item}</span>
                        {ing.note && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 ms-1.5">
                            ({ing.note})
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {recipe.ingredients.length > 0 && (
              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyShoppingList()}
                    className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition ${
                      copiedFeedback?.kind === 'copied'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {copiedFeedback?.kind === 'copied' ? (
                      <Check className="w-4 h-4 shrink-0" />
                    ) : (
                      <ClipboardList className="w-4 h-4 shrink-0" />
                    )}
                    <span>
                      {copiedFeedback?.kind === 'copied'
                        ? t.detail.copiedShoppingList
                        : t.detail.exportShoppingList(checkedCount, recipe.ingredients.length)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleShareShoppingList()}
                    className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-2 border transition ${
                      copiedFeedback?.kind === 'shared' || copiedFeedback?.kind === 'sharedCopied'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {copiedFeedback?.kind === 'shared' || copiedFeedback?.kind === 'sharedCopied' ? (
                      <Check className="w-4 h-4 shrink-0" />
                    ) : (
                      <Share2 className="w-4 h-4 shrink-0" />
                    )}
                    <span>
                      {copiedFeedback?.kind === 'shared'
                        ? t.detail.sharedShoppingList
                        : t.detail.shareShoppingList}
                    </span>
                  </button>
                </div>

                {copiedFeedback && (
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {copiedFeedback.kind === 'sharedCopied'
                      ? t.detail.sharedFallbackCopied
                      : t.detail.copiedShoppingListHint(
                          copiedFeedback.count,
                          copiedFeedback.wasCheckedSubset
                        )}
                  </p>
                )}

                {manualCopyText && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 p-3 space-y-2">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      {t.detail.copyFailedHint}
                    </p>
                    <textarea
                      readOnly
                      rows={Math.min(7, manualCopyText.split('\n').length)}
                      value={manualCopyText}
                      onFocus={(e) => e.currentTarget.select()}
                      className="w-full rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-950 p-2.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Switch */}
      <div className="mt-8 lg:hidden">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => setMobilePanel('steps')}
            className={`min-h-[44px] rounded-lg text-xs font-semibold transition ${
              mobilePanel === 'steps'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {t.detail.instructionsTab(recipe.steps.length)}
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel('transcript')}
            className={`min-h-[44px] rounded-lg text-xs font-semibold transition ${
              mobilePanel === 'transcript'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {t.detail.transcriptTab(recipe.transcript.length)}
          </button>
        </div>
      </div>

      {/* Linked Steps & Transcript */}
      <div className="mt-5 lg:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section
          aria-label={t.detail.stepByStep}
          className={`lg:col-span-7 space-y-3 ${mobilePanel === 'steps' ? 'block' : 'hidden lg:block'}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {t.detail.stepByStep}
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t.detail.tapTimestampHint}
            </span>
          </div>

          <div className="space-y-3">
            {recipe.steps.map((step) => {
              const isActive = activeStepNumber === step.stepNumber;
              const linkedSeg = recipe.transcript.find(
                (seg) =>
                  seg.linkedStepNumber === step.stepNumber ||
                  (step.linkedTimestampSec >= seg.startSec && step.linkedTimestampSec <= seg.endSec)
              );
              const isThisTimer = timerStepId === step.id;

              return (
                <div
                  key={step.id}
                  ref={(el) => {
                    stepRefs.current[step.stepNumber] = el;
                  }}
                  className={`rounded-2xl p-5 border transition ${
                    isActive
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-500/60'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums ${
                          isActive
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {step.stepNumber}
                      </span>
                      <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                        {step.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        jumpToStep(step.stepNumber, step.linkedTimestampSec, window.innerWidth < 1024)
                      }
                      className={`min-h-[38px] px-3 rounded-lg font-mono text-xs font-semibold tabular-nums inline-flex items-center gap-1.5 transition ${
                        isActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                      }`}
                    >
                      <Play className="w-3 h-3" />
                      <span dir="ltr">{formatTimestamp(step.linkedTimestampSec)}</span>
                    </button>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {step.instruction}
                  </p>

                  {linkedSeg && (
                    <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-start justify-between gap-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed">
                        <span className="not-italic font-mono font-semibold text-emerald-700 dark:text-emerald-400 me-1.5" dir="ltr">
                          [{formatTimestamp(linkedSeg.startSec)}]
                        </span>
                        “{linkedSeg.text}”
                      </p>
                    </div>
                  )}

                  {step.durationSec && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleStepTimer(step.id, step.durationSec!)}
                        className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition tabular-nums ${
                          isThisTimer && timerRunning
                            ? 'bg-amber-600 text-white'
                            : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Timer className="w-3.5 h-3.5" />
                        <span>
                          {isThisTimer
                            ? timerRemainingSec === 0
                              ? t.detail.timerComplete
                              : `${timerRunning ? t.detail.pause : t.detail.resume} ${formatTimestamp(timerRemainingSec)}`
                            : t.detail.startTimer(formatTimestamp(step.durationSec))}
                        </span>
                      </button>

                      {isThisTimer && (
                        <button
                          type="button"
                          onClick={() => {
                            setTimerRunning(false);
                            setTimerRemainingSec(step.durationSec!);
                          }}
                          aria-label={t.detail.reset}
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section
          aria-label={t.detail.videoTranscript}
          className={`lg:col-span-5 space-y-3 lg:sticky lg:top-20 ${mobilePanel === 'transcript' ? 'block' : 'hidden lg:block'}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {t.detail.videoTranscript}
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t.detail.linkedToPrepHint}
            </span>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
            {recipe.transcript.map((seg) => {
              const isCurrent = activeTranscriptSegment?.id === seg.id;
              return (
                <button
                  key={seg.id}
                  ref={(el) => {
                    transcriptRefs.current[seg.id] = el;
                  }}
                  type="button"
                  onClick={() => jumpFromTranscript(seg.startSec, seg.linkedStepNumber)}
                  className={`w-full text-start p-4 transition flex items-start gap-3 ${
                    isCurrent
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/35'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span
                    dir="ltr"
                    className={`font-mono text-xs font-semibold tabular-nums px-2 py-1 rounded-md shrink-0 mt-0.5 ${
                      isCurrent
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {formatTimestamp(seg.startSec)}
                  </span>

                  <div className="flex-1 min-w-0">
                    {seg.linkedStepNumber && (
                      <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                        {t.detail.linkedToStep(seg.linkedStepNumber)}
                      </div>
                    )}
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      {seg.text}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
