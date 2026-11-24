import React, { useEffect, useRef, useState } from 'react';
import {
  Globe,
  Link2,
  Loader2,
  Mic,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { SEED_IMAGES } from '../data/seedImages';
import { getCopy } from '../i18n/translations';
import {
  Ingredient,
  InstructionStep,
  Language,
  Recipe,
  SocialPlatform,
  TranscriptSegment,
} from '../types/recipe';
import {
  cleanSocialText,
  detectPlatformFromUrl,
  extractCreatorHandleFromUrl,
  extractYouTubeVideoId,
  formatPlatformLabel,
  formatTimestamp,
  normalizeTagWithSpaces,
  parseSocialCaptionAndTranscript,
  parseTimestampToSec,
} from '../utils/recipeParser';
import { fetchSocialLinkMetadata, normalizeSocialUrl } from '../utils/socialExtractor';
import { PlatformIcon, RecipeImage } from './PlatformIcon';

export interface SharedIncomingPayload {
  url?: string;
  title?: string;
  text?: string;
}

interface ImportRecipeModalProps {
  lang: Language;
  isOpen: boolean;
  editingRecipe?: Recipe | null;
  initialShared?: SharedIncomingPayload | null;
  onClose: () => void;
  onSaveRecipe: (recipe: Recipe) => void;
  onDeleteRecipe?: (recipeId: string) => void;
}

const SAMPLE_IMPORTS: Record<
  Language,
  Record<
    SocialPlatform,
    {
      url: string;
      title: string;
      creatorHandle: string;
      coverImage?: string;
      rawText: string;
    }
  >
> = {
  en: {
    instagram: {
      url: 'https://www.instagram.com/reel/C9vR3k8T2wA/',
      title: 'Crispy Halloumi & Hot Honey Citrus Bowl',
      creatorHandle: '@olivia.greens',
      rawText: `#Vegetarian #15-Minute #High-Protein

Ingredients:
- 220 g halloumi cheese, sliced thick
- 2 cups baby arugula
- 1 whole blood orange, segmented
- 2 tbsp hot honey
- 1 tbsp olive oil

[00:00] Here is my ten-minute lunch bowl when I crave salty and sweet crunch.
[00:07] Sear thick slices of dry halloumi in a hot skillet for 2 minutes per side until blistered gold.
[00:22] Toss arugula with orange juice, olive oil, and flaky salt right on the serving plate.
[00:36] Lay warm seared halloumi over the greens and drizzle generously with warm hot honey.`,
    },
    tiktok: {
      url: 'https://www.tiktok.com/@sam.skillet/video/7429104821942',
      title: '10-Minute Chili Crisp Garlic Butter Noodles',
      creatorHandle: '@sam.skillet',
      rawText: `#Pasta #15-Minute #Spicy #Weeknight

Ingredients:
- 200 g knife-cut wheat noodles
- 2 tbsp unsalted butter
- 3 cloves garlic, minced
- 2 tbsp chili crisp
- 2 stalks scallions, sliced

00:00
Late-night ten-minute noodles with pantry ingredients only.
00:08
Boil knife-cut noodles for 4 minutes while you melt butter gently in a skillet.
00:20
Bloom minced garlic and chili crisp in the foaming butter for 45 seconds without burning.
00:34
Toss drained noodles with 3 tbsp noodle water until glossy and finish with scallions.`,
    },
    facebook: {
      url: 'https://www.facebook.com/reel/84910293847123',
      title: 'Sheet-Pan Garlic Herb Chicken & Baby Potatoes',
      creatorHandle: '@family.table',
      rawText: `#High-Protein #Meal-Prep #Weeknight

Ingredients:
• 500 g boneless chicken thighs
• 400 g baby gold potatoes, halved
• 2 tbsp olive oil
• 1 tbsp rosemary & thyme, chopped

Instructions:
1. Toss halved baby potatoes with olive oil and salt, roasting at 215C for 12 minutes first.
2. Add seasoned chicken thighs and chopped herbs to the hot tray and roast 18 minutes more.

Video Transcript:
0:00 - 0:09: Zero-fuss weeknight sheet pan dinner with minimal dishes.
0:10 - 0:25: Toss halved baby potatoes with olive oil and salt so they crisp up first for twelve minutes.
0:26 - 0:45: Nestle seasoned chicken thighs and chopped herbs onto the hot tray and roast eighteen minutes.`,
    },
    youtube: {
      url: 'https://www.youtube.com/watch?v=1IszT_guI08',
      title: 'Spicy Penne Arrabbiata in 20 Minutes',
      creatorHandle: '@keerthanacooks2669',
      coverImage: 'https://i.ytimg.com/vi/1IszT_guI08/hqdefault.jpg',
      rawText: `#Pasta #Spicy #Vegetarian #20-Minute

Ingredients:
- 300 g penne pasta
- 3 tbsp olive oil
- 5 cloves garlic, sliced
- 1 tsp red chili flakes
- 400 g crushed San Marzano tomatoes
- 1 handful fresh basil leaves

Chapters:
00:00 Toast sliced garlic and chili flakes gently in olive oil for 2 minutes.
00:25 Simmer crushed tomatoes with salt for 8 minutes until thick and glossy.
01:05 Toss al dente penne with pasta water and fresh basil before serving.`,
    },
  },
  he: {
    instagram: {
      url: 'https://www.instagram.com/reel/C9vR3k8T2wA/',
      title: 'קערת חלומי קריספי ודבש חריף',
      creatorHandle: '@tal.kitchen',
      rawText: `#צמחוני #מהיר #ארוחת_צהריים

מצרכים:
- 220 גרם גבינת חלומי פרוסה עבה
- 2 כוסות עלי רוקט טריים
- 2 כפות דבש מתובל
- 1 כף שמן זית

[00:00] ארוחת צהריים בעשר דקות כשבא לכם שילוב של מלוח ומתוק.
[00:08] צורבים פרוסות חלומי במחבת חמה 2 דקות מכל צד עד להשחמה יפה.
[00:22] מערבבים עלי רוקט עם שמן זית, מיץ לימון ומלח ים על צלחת ההגשה.
[00:35] מניחים את החלומי החם מעל ומזלפים דבש מתובל.`,
    },
    tiktok: {
      url: 'https://www.tiktok.com/@sam.skillet/video/7429104821942',
      title: 'אטריות חמאת שום וצ׳ילי קריספ ב-10 דקות',
      creatorHandle: '@sam.skillet',
      rawText: `#פסטה #חריף #מהיר

מצרכים:
- 200 גרם אטריות חיטה רחבות
- 2 כפות חמאה
- 3 שיני שום כתושות
- 2 כפות שמן צ׳ילי קריספי

00:00
מתכון לילה מהיר מחומרים שיש תמיד במזווה.
00:08
מבשלים את האטריות 4 דקות בזמן שממיסים בעדינות חמאה במחבת.
00:20
מטגנים שום וצ׳ילי קריספי בחמאה המוקצפת כ-45 שניות.
00:34
מקפיצים את האטריות עם מעט ממי הבישול לזיגוג מבריק ומגישים.`,
    },
    facebook: {
      url: 'https://www.facebook.com/reel/84910293847123',
      title: 'פרגיות שום ועשבי תיבול בתבנית עם תפוחי אדמה',
      creatorHandle: '@family.table',
      rawText: `#עוף #ארוחת_ערב #בתנור

מצרכים:
• 500 גרם פרגיות
• 400 גרם תפוחי אדמה קטנים חצויים
• 2 כפות שמן זית
• 1 כף רוזמרין וטימין קצוצים

הוראות הכנה:
1. מערבבים תפוחי אדמה עם שמן זית ומלח ואופים 12 דקות בתנור חם.
2. מוסיפים את הפרגיות ועשבי התיבול ואופים 18 דקות נוספות.

תמלול:
0:00 - 0:09: ארוחת ערב בתבנית אחת בלי כלים מיותרים.
0:10 - 0:25: אופים את תפוחי האדמה 12 דקות מראש שיקבלו קראסט זהוב.
0:26 - 0:45: מוסיפים את הפרגיות ועשבי התיבול לצלייה של 18 דקות.`,
    },
    youtube: {
      url: 'https://www.youtube.com/watch?v=1IszT_guI08',
      title: 'פנה ארביאטה חריפה ב-20 דקות',
      creatorHandle: '@keerthanacooks2669',
      coverImage: 'https://i.ytimg.com/vi/1IszT_guI08/hqdefault.jpg',
      rawText: `#פסטה #חריף #צמחוני #מהיר

מצרכים:
- 300 גרם פסטה פנה
- 3 כפות שמן זית
- 5 שיני שום פרוסות
- 1 כפית פתיתי צ׳ילי חריף
- 400 גרם עגבניות מרוסקות
- 1 חופן עלי בזיליקום טריים

פרקים:
00:00 מטגנים בעדינות שום פרוס וצ׳ילי בשמן זית כ-2 דקות.
00:25 מבשלים את העגבניות המרוסקות עם מלח 8 דקות עד לרוטב סמיך.
01:05 מערבבים פסטה מבושלת אל דנטה עם מעט ממי הבישול ובזיליקום טרי.`,
    },
  },
};

const COVER_PRESETS = [
  { label: 'Pasta', url: SEED_IMAGES.chiliRigatoni },
  { label: 'Breakfast', url: SEED_IMAGES.foldedEggToast },
  { label: 'Bowl', url: SEED_IMAGES.gingerChickenBowl },
  { label: 'Salad', url: SEED_IMAGES.cucumberSesameSalad },
  { label: 'Baking', url: SEED_IMAGES.brownButterCookies },
  { label: 'Toast', url: SEED_IMAGES.whippedRicottaSourdough },
];

export const ImportRecipeModal: React.FC<ImportRecipeModalProps> = ({
  lang,
  isOpen,
  editingRecipe,
  initialShared,
  onClose,
  onSaveRecipe,
  onDeleteRecipe,
}) => {
  const [sourceUrl, setSourceUrl] = useState('');
  const [platform, setPlatform] = useState<SocialPlatform>('instagram');
  const [title, setTitle] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [creatorHandle, setCreatorHandle] = useState('');
  const [prepMinutes, setPrepMinutes] = useState(10);
  const [cookMinutes, setCookMinutes] = useState(15);
  const [servings, setServings] = useState(2);
  const [coverImage, setCoverImage] = useState<string>('');
  const [extractedVideoCover, setExtractedVideoCover] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [hasExplicitDesc, setHasExplicitDesc] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [rawPasteText, setRawPasteText] = useState('');
  const [summary, setSummary] = useState('');
  const [videoDurationHint, setVideoDurationHint] = useState<number | undefined>(undefined);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: 'new-ing-1', amount: null, unit: '', item: '' },
  ]);
  const [steps, setSteps] = useState<InstructionStep[]>([
    {
      id: 'new-step-1',
      stepNumber: 1,
      title: 'Step 1',
      instruction: '',
      linkedTimestampSec: 0,
    },
  ]);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([
    {
      id: 'new-tr-1',
      startSec: 0,
      endSec: 15,
      text: '',
      linkedStepNumber: 1,
      prepCue: 'Step 1',
    },
  ]);

  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [linkStatus, setLinkStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [parseFeedback, setParseFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const lastAutoFetchedUrl = useRef<string>('');
  const autoFetchTimerRef = useRef<number | null>(null);
  const rawPasteTextRef = useRef<string>('');
  const userPickedCustomThumb = useRef<boolean>(false);
  const titleEditedByUser = useRef<boolean>(false);
  const videoTitleEditedByUser = useRef<boolean>(false);
  const extractionSeqRef = useRef<number>(0);
  const isOpenRef = useRef<boolean>(isOpen);
  isOpenRef.current = isOpen;
  rawPasteTextRef.current = rawPasteText;
  const t = getCopy(lang);
  const isEditing = Boolean(editingRecipe);

  useEffect(() => {
    if (!isOpen) {
      extractionSeqRef.current += 1;
      setIsFetchingLink(false);
      setIsTranscribingAudio(false);
      if (autoFetchTimerRef.current !== null) {
        window.clearTimeout(autoFetchTimerRef.current);
        autoFetchTimerRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      extractionSeqRef.current += 1;
      if (autoFetchTimerRef.current !== null) {
        window.clearTimeout(autoFetchTimerRef.current);
      }
    };
  }, []);

  const resetForm = () => {
    setSourceUrl('');
    setPlatform('instagram');
    setTitle('');
    setVideoTitle('');
    setCreatorHandle('');
    setPrepMinutes(10);
    setCookMinutes(15);
    setServings(2);
    setCoverImage('');
    setExtractedVideoCover('');
    setAudioUrl(undefined);
    setHasExplicitDesc(false);
    setIsTranscribingAudio(false);
    setTags([]);
    setNewTagInput('');
    setRawPasteText('');
    rawPasteTextRef.current = '';
    setSummary('');
    setVideoDurationHint(undefined);
    setIngredients([{ id: `new-ing-${Date.now()}`, amount: null, unit: '', item: '' }]);
    setSteps([
      {
        id: `new-step-${Date.now()}`,
        stepNumber: 1,
        title: 'Step 1',
        instruction: '',
        linkedTimestampSec: 0,
      },
    ]);
    setTranscript([
      {
        id: `new-tr-${Date.now()}`,
        startSec: 0,
        endSec: 15,
        text: '',
        linkedStepNumber: 1,
        prepCue: 'Step 1',
      },
    ]);
    setLinkStatus(null);
    setParseFeedback(null);
    setErrorMsg(null);
    setConfirmingDelete(false);
    lastAutoFetchedUrl.current = '';
    userPickedCustomThumb.current = false;
    titleEditedByUser.current = false;
    videoTitleEditedByUser.current = false;
    if (autoFetchTimerRef.current !== null) {
      window.clearTimeout(autoFetchTimerRef.current);
      autoFetchTimerRef.current = null;
    }
  };

  const applyParsedText = (
    textToParse: string,
    options?: {
      forceReplaceTitle?: boolean;
      overrideTitleIfEmpty?: boolean;
      explicitTitle?: string;
      explicitVideoTitle?: string;
      durationSec?: number;
      clearWhenEmpty?: boolean;
    }
  ) => {
    const cleanedSource = cleanSocialText(textToParse, { stripAllHashtags: false });
    const parsed = parseSocialCaptionAndTranscript(cleanedSource, options?.durationSec ?? videoDurationHint);
    const shouldForceTitle = options?.forceReplaceTitle ?? false;
    const overrideIfEmpty = options?.overrideTitleIfEmpty ?? true;

    const finalIngredients = parsed.ingredients;
    const finalSteps = parsed.steps;
    const finalTranscript = parsed.transcript;
    const finalTags = parsed.tags;

    const candidateDishTitle =
      parsed.dishName?.trim() ||
      options?.explicitTitle?.trim() ||
      '';
    const rawHeadline = options?.explicitVideoTitle?.trim() || parsed.videoTitle?.trim() || '';
    const candidateVideoTitle = cleanSocialText(rawHeadline, { stripAllHashtags: true });

    if (shouldForceTitle) {
      setTitle(candidateDishTitle);
    } else if (overrideIfEmpty && !titleEditedByUser.current && candidateDishTitle) {
      setTitle(candidateDishTitle);
    }

    if (candidateVideoTitle && (shouldForceTitle || !videoTitleEditedByUser.current)) {
      setVideoTitle(candidateVideoTitle);
    }

    if (finalTags.length > 0) {
      setTags(finalTags);
    } else if (shouldForceTitle || options?.clearWhenEmpty) {
      setTags([]);
    }

    if (finalIngredients.length > 0) {
      setIngredients(finalIngredients);
    } else if (options?.clearWhenEmpty) {
      setIngredients([]);
    }

    if (finalSteps.length > 0) {
      setSteps(finalSteps);
    } else if (options?.clearWhenEmpty) {
      setSteps([]);
    }

    if (finalTranscript.length > 0) {
      setTranscript(finalTranscript);
    } else if (options?.clearWhenEmpty) {
      setTranscript([]);
    }

    setParseFeedback(
      t.importer.extractedFeedback(
        finalIngredients.length,
        finalSteps.length,
        finalTranscript.length
      )
    );

    return {
      ingredients: finalIngredients,
      steps: finalSteps,
      transcript: finalTranscript,
      dishName: candidateDishTitle,
    };
  };

  const runStage2AudioTranscription = async (
    targetAudioUrl: string,
    options: {
      requestSeq: number;
      captionContext?: string;
      explicitVideoTitle?: string;
      durationHint?: number;
    }
  ) => {
    const { requestSeq, captionContext, explicitVideoTitle, durationHint } = options;
    const isStale = () => requestSeq !== extractionSeqRef.current || !isOpenRef.current;

    setIsTranscribingAudio(true);
    try {
      const { transcribeAudioWithBrowserWhisper } = await import('../utils/audioTranscriber');
      if (isStale()) return;
      const whisperRes = await transcribeAudioWithBrowserWhisper(targetAudioUrl, {
        lang,
        hintText: captionContext || explicitVideoTitle,
        shouldAbort: isStale,
        onProgress: (st) => {
          if (!isStale()) {
            setLinkStatus({ ok: true, text: st.message });
          }
        },
      });
      if (isStale()) return;

      const cleanedCaptionContext = cleanSocialText(captionContext || '', { stripAllHashtags: false });
      const cleanedTranscript = cleanSocialText(whisperRes.rawTranscript, { stripAllHashtags: true });
      const combinedTranscriptAndContext = [
        cleanedCaptionContext,
        cleanedTranscript,
      ]
        .filter(Boolean)
        .join('\n\n');

      setRawPasteText(combinedTranscriptAndContext);
      rawPasteTextRef.current = combinedTranscriptAndContext;
      const effectiveDuration = whisperRes.durationSec || durationHint;
      if (effectiveDuration) {
        setVideoDurationHint(effectiveDuration);
      }

      applyParsedText(combinedTranscriptAndContext, {
        forceReplaceTitle: !titleEditedByUser.current,
        overrideTitleIfEmpty: true,
        explicitVideoTitle,
        durationSec: effectiveDuration,
        clearWhenEmpty: true,
      });

      setLinkStatus({ ok: true, text: t.importer.noAudioDescFallbackHint });
    } catch {
      if (!isStale()) {
        setLinkStatus({
          ok: false,
          text:
            lang === 'he'
              ? 'לא ניתן היה לתמלל את האודיו בדפדפן — ניתן להזין מצרכים או להדביק תמלול ידנית.'
              : 'Could not transcribe video audio in this browser — paste a transcript or edit ingredients manually.',
        });
      }
    } finally {
      if (requestSeq === extractionSeqRef.current) {
        setIsTranscribingAudio(false);
      }
    }
  };

  const runLinkExtraction = async (
    urlToExtract: string,
    options: { forceThumbnail?: boolean; replaceAll?: boolean } = {}
  ) => {
    const { forceThumbnail = false, replaceAll = false } = options;
    if (autoFetchTimerRef.current !== null) {
      window.clearTimeout(autoFetchTimerRef.current);
      autoFetchTimerRef.current = null;
    }
    const trimmed = urlToExtract.trim();
    if (!trimmed) {
      setLinkStatus({ ok: false, text: t.importer.pasteUrlFirst });
      return;
    }

    const requestSeq = ++extractionSeqRef.current;
    const normalizedInput = normalizeSocialUrl(trimmed);
    lastAutoFetchedUrl.current = normalizedInput || trimmed;

    if (replaceAll) {
      titleEditedByUser.current = false;
      videoTitleEditedByUser.current = false;
      userPickedCustomThumb.current = false;
      setTitle('');
      setVideoTitle('');
      setCreatorHandle(extractCreatorHandleFromUrl(trimmed) || '');
      setRawPasteText('');
      rawPasteTextRef.current = '';
      setAudioUrl(undefined);
      setHasExplicitDesc(false);
      setTags([]);
      setIngredients([]);
      setSteps([]);
      setTranscript([]);
      setParseFeedback(null);
      setSummary('');
    }

    setIsFetchingLink(true);
    setIsTranscribingAudio(false);
    setLinkStatus({ ok: true, text: t.importer.autoFetching });
    const res = await fetchSocialLinkMetadata(trimmed, lang);

    // Ignore stale async response if user pasted another URL meanwhile
    if (requestSeq !== extractionSeqRef.current) return;

    setIsFetchingLink(false);

    if (res.platform) setPlatform(res.platform);
    if (res.normalizedUrl) {
      setSourceUrl(res.normalizedUrl);
      lastAutoFetchedUrl.current = normalizeSocialUrl(res.normalizedUrl) || res.normalizedUrl;
    }
    if (res.creatorHandle) {
      setCreatorHandle(res.creatorHandle);
    }
    if (res.videoDurationSec) {
      setVideoDurationHint(res.videoDurationSec);
    }
    setAudioUrl(res.audioUrl);
    setHasExplicitDesc(Boolean(res.hasExplicitDescription));

    if (res.videoTitle && (replaceAll || !videoTitleEditedByUser.current)) {
      setVideoTitle(res.videoTitle);
    }

    if (res.coverImage) {
      setExtractedVideoCover(res.coverImage);
      if (forceThumbnail || replaceAll || !userPickedCustomThumb.current) {
        setCoverImage(res.coverImage);
        userPickedCustomThumb.current = false;
      }
    }

    let stage1IngredientsLen = 0;
    let stage1StepsLen = 0;

    if (res.ok) {
      const nextCaption = res.captionText || '';
      const resolvedRaw = replaceAll
        ? nextCaption
        : (() => {
            const currentRaw = rawPasteTextRef.current.trim();
            if (!nextCaption) return currentRaw;
            if (!currentRaw || currentRaw === nextCaption) return nextCaption;
            return `${nextCaption}\n\n${currentRaw}`;
          })();

      if (resolvedRaw) {
        const cleanedRawDesc = cleanSocialText(resolvedRaw, { stripAllHashtags: false });
        setRawPasteText(cleanedRawDesc || resolvedRaw);
        rawPasteTextRef.current = cleanedRawDesc || resolvedRaw;

        // Stage 1: Extract strictly from cleaned explicit description metadata first
        const stage1Parsed = applyParsedText(cleanedRawDesc || resolvedRaw, {
          forceReplaceTitle: replaceAll || !titleEditedByUser.current,
          overrideTitleIfEmpty: true,
          explicitTitle: res.audioUrl && !res.hasExplicitDescription ? undefined : res.title,
          explicitVideoTitle: res.videoTitle,
          durationSec: res.videoDurationSec,
          clearWhenEmpty: true,
        });
        stage1IngredientsLen = stage1Parsed.ingredients.length;
        stage1StepsLen = stage1Parsed.steps.length;
      } else if (res.title) {
        setTitle(res.title);
      }
    }

    setLinkStatus({ ok: res.ok, text: res.message });

    // Stage 2: Only if explicit description was missing/empty OR yielded 0 ingredients & 0 steps -> run lightweight audio transcription
    const needsTranscriptFallback =
      res.ok &&
      Boolean(res.audioUrl) &&
      (!res.hasExplicitDescription || (stage1IngredientsLen === 0 && stage1StepsLen === 0));

    if (needsTranscriptFallback && res.audioUrl) {
      await runStage2AudioTranscription(res.audioUrl, {
        requestSeq,
        captionContext: res.captionText,
        explicitVideoTitle: res.videoTitle || res.title,
        durationHint: res.videoDurationSec,
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (editingRecipe) {
      if (autoFetchTimerRef.current !== null) {
        window.clearTimeout(autoFetchTimerRef.current);
        autoFetchTimerRef.current = null;
      }
      extractionSeqRef.current += 1;
      setIsFetchingLink(false);
      setIsTranscribingAudio(false);
      setSourceUrl(editingRecipe.sourceUrl);
      setPlatform(editingRecipe.platform);
      setTitle(editingRecipe.title);
      setVideoTitle(editingRecipe.videoTitle || '');
      setCreatorHandle(editingRecipe.creatorHandle);
      setPrepMinutes(editingRecipe.prepMinutes);
      setCookMinutes(editingRecipe.cookMinutes);
      setServings(editingRecipe.servings);
      setCoverImage(editingRecipe.coverImage);
      setExtractedVideoCover(editingRecipe.coverImage);
      setAudioUrl(undefined);
      setHasExplicitDesc(false);
      setTags(editingRecipe.tags);
      setNewTagInput('');
      setSummary(editingRecipe.summary);
      setVideoDurationHint(editingRecipe.videoDurationSec);
      setIngredients(
        editingRecipe.ingredients.length > 0
          ? editingRecipe.ingredients
          : [{ id: `new-ing-${Date.now()}`, amount: null, unit: '', item: '' }]
      );
      setSteps(
        editingRecipe.steps.length > 0
          ? editingRecipe.steps
          : [
              {
                id: `new-step-${Date.now()}`,
                stepNumber: 1,
                title: t.detail.stepLabel(1),
                instruction: '',
                linkedTimestampSec: 0,
              },
            ]
      );
      setTranscript(
        editingRecipe.transcript.length > 0
          ? editingRecipe.transcript
          : [
              {
                id: `new-tr-${Date.now()}`,
                startSec: 0,
                endSec: 15,
                text: '',
                linkedStepNumber: 1,
                prepCue: t.detail.stepLabel(1),
              },
            ]
      );
      setRawPasteText('');
      rawPasteTextRef.current = '';
      setLinkStatus(null);
      setParseFeedback(null);
      setErrorMsg(null);
      setConfirmingDelete(false);
      lastAutoFetchedUrl.current = normalizeSocialUrl(editingRecipe.sourceUrl) || editingRecipe.sourceUrl;
      userPickedCustomThumb.current = Boolean(editingRecipe.coverImage);
      titleEditedByUser.current = !initialShared?.url;
      videoTitleEditedByUser.current = !initialShared?.url && Boolean(editingRecipe.videoTitle);
      if (initialShared?.text) {
        setRawPasteText(initialShared.text);
        rawPasteTextRef.current = initialShared.text;
        applyParsedText(initialShared.text, {
          overrideTitleIfEmpty: !initialShared.title,
        });
      }
      if (initialShared?.url) {
        void runLinkExtraction(initialShared.url, { forceThumbnail: true });
      }
      return;
    }

    resetForm();

    if (initialShared) {
      if (initialShared.title) {
        setTitle(initialShared.title);
        titleEditedByUser.current = true;
      }
      if (initialShared.text) {
        setRawPasteText(initialShared.text);
        rawPasteTextRef.current = initialShared.text;
        applyParsedText(initialShared.text, {
          overrideTitleIfEmpty: !initialShared.title,
        });
      }
      if (initialShared.url) {
        const normalized = normalizeSocialUrl(initialShared.url);
        setSourceUrl(normalized);
        const detected = detectPlatformFromUrl(normalized);
        if (detected) setPlatform(detected);
        const handle = extractCreatorHandleFromUrl(normalized);
        if (handle) setCreatorHandle(handle);
        if (detected) {
          void runLinkExtraction(normalized, { forceThumbnail: true, replaceAll: !initialShared.text });
        }
      }
    }
  }, [isOpen, editingRecipe, initialShared]);

  if (!isOpen) return null;

  const isCompleteContentUrl = (rawUrl: string): boolean => {
    try {
      const parsed = new URL(rawUrl.trim());
      return parsed.pathname.length > 1 || parsed.search.length > 1;
    } catch {
      return false;
    }
  };

  const handleUrlChange = (val: string, immediate = false) => {
    setSourceUrl(val);
    setLinkStatus(null);
    const detected = detectPlatformFromUrl(val);
    if (detected) setPlatform(detected);

    const trimmed = val.trim();
    const normalizedTrimmed = normalizeSocialUrl(trimmed);
    const isDifferentUrl =
      Boolean(lastAutoFetchedUrl.current) &&
      Boolean(normalizedTrimmed) &&
      normalizedTrimmed !== lastAutoFetchedUrl.current;

    const handle = extractCreatorHandleFromUrl(val);
    if (handle && (isDifferentUrl || !creatorHandle)) {
      setCreatorHandle(handle);
    }

    if (isDifferentUrl) {
      userPickedCustomThumb.current = false;
      titleEditedByUser.current = false;
      videoTitleEditedByUser.current = false;
    }

    const ytId = extractYouTubeVideoId(trimmed);
    if (ytId) {
      const ytThumb = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
      setExtractedVideoCover(ytThumb);
      if (!userPickedCustomThumb.current || isDifferentUrl) {
        setCoverImage(ytThumb);
      }
    }

    if (autoFetchTimerRef.current !== null) {
      window.clearTimeout(autoFetchTimerRef.current);
      autoFetchTimerRef.current = null;
    }

    if (
      detected &&
      isCompleteContentUrl(trimmed) &&
      normalizedTrimmed !== lastAutoFetchedUrl.current
    ) {
      const replaceExisting = Boolean(lastAutoFetchedUrl.current);
      if (immediate) {
        void runLinkExtraction(trimmed, { forceThumbnail: true, replaceAll: replaceExisting });
      } else {
        autoFetchTimerRef.current = window.setTimeout(() => {
          void runLinkExtraction(trimmed, { forceThumbnail: true, replaceAll: replaceExisting });
        }, 650);
      }
    }
  };

  const addTagFromInput = (rawVal: string) => {
    const parts = rawVal
      .split(',')
      .map((part) => normalizeTagWithSpaces(part))
      .filter((part) => part.length >= 2);
    if (parts.length === 0) return;

    setTags((prev) => {
      const next = [...prev];
      for (const candidate of parts) {
        if (!next.some((existing) => existing.toLowerCase() === candidate.toLowerCase())) {
          next.push(candidate);
        }
      }
      return next;
    });
    setNewTagInput('');
  };

  const toggleQuickTag = (tagLabel: string) => {
    const normalized = normalizeTagWithSpaces(tagLabel);
    if (!normalized) return;
    setTags((prev) => {
      const exists = prev.some((existing) => existing.toLowerCase() === normalized.toLowerCase());
      if (exists) {
        return prev.filter((existing) => existing.toLowerCase() !== normalized.toLowerCase());
      }
      return [...prev, normalized];
    });
  };

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const loadSample = (samplePlatform: SocialPlatform) => {
    const sample = SAMPLE_IMPORTS[lang][samplePlatform];
    lastAutoFetchedUrl.current = normalizeSocialUrl(sample.url) || sample.url;
    userPickedCustomThumb.current = false;
    titleEditedByUser.current = false;
    videoTitleEditedByUser.current = false;
    setPlatform(samplePlatform);
    setSourceUrl(sample.url);
    setTitle(sample.title);
    setVideoTitle(sample.title);
    setCreatorHandle(sample.creatorHandle);
    setAudioUrl(undefined);
    setHasExplicitDesc(true);
    if (sample.coverImage) {
      setExtractedVideoCover(sample.coverImage);
      setCoverImage(sample.coverImage);
    } else {
      setExtractedVideoCover('');
      setCoverImage('');
    }
    setRawPasteText(sample.rawText);
    rawPasteTextRef.current = sample.rawText;
    const parsedSample = applyParsedText(sample.rawText, {
      forceReplaceTitle: true,
      explicitTitle: sample.title,
      explicitVideoTitle: sample.title,
    });
    setLinkStatus({
      ok: true,
      text: t.importer.extractedFeedback(
        parsedSample.ingredients.length,
        parsedSample.steps.length,
        parsedSample.transcript.length
      ),
    });
    setSummary(`${formatPlatformLabel(samplePlatform, lang)} (${sample.creatorHandle})`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        userPickedCustomThumb.current = true;
        setCoverImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg(t.importer.titleRequiredError);
      return;
    }

    const cleanUrl =
      normalizeSocialUrl(sourceUrl) ||
      (platform === 'instagram'
        ? 'https://www.instagram.com/reels/'
        : platform === 'tiktok'
          ? 'https://www.tiktok.com/'
          : platform === 'youtube'
            ? 'https://www.youtube.com/'
            : 'https://www.facebook.com/reel/');

    const ytFallbackId = extractYouTubeVideoId(cleanUrl);
    const resolvedCoverImage =
      coverImage ||
      (!userPickedCustomThumb.current
        ? extractedVideoCover || (ytFallbackId ? `https://i.ytimg.com/vi/${ytFallbackId}/hqdefault.jpg` : '')
        : '');

    const pendingTags = newTagInput.trim()
      ? newTagInput
          .split(',')
          .map((part) => normalizeTagWithSpaces(part))
          .filter((part) => part.length >= 2)
      : [];
    const finalTags: string[] = [];
    for (const candidate of [...tags, ...pendingTags]) {
      const normalized = normalizeTagWithSpaces(candidate);
      if (
        normalized &&
        !finalTags.some((existing) => existing.toLowerCase() === normalized.toLowerCase())
      ) {
        finalTags.push(normalized);
      }
    }

    const validSteps = steps.filter((s) => s.instruction.trim());
    const finalSteps =
      validSteps.length > 0
        ? validSteps.map((s, idx) => ({ ...s, stepNumber: idx + 1 }))
        : [
            {
              id: `step-${Date.now()}`,
              stepNumber: 1,
              title: t.detail.stepLabel(1),
              instruction: summary.trim() || rawPasteText.trim() || cleanUrl,
              linkedTimestampSec: 0,
            },
          ];

    const finalTranscript = transcript.filter(
      (tr) => tr.text.trim() || finalSteps.some((s) => s.stepNumber === tr.linkedStepNumber)
    );
    const lastSec =
      videoDurationHint ||
      (finalTranscript.length > 0
        ? Math.max(...finalTranscript.map((tr) => tr.endSec))
        : Math.max(30, finalSteps.length * 15));

    const savedRecipe: Recipe = {
      id: editingRecipe?.id ?? `rec-custom-${Date.now()}`,
      title: title.trim(),
      videoTitle: videoTitle.trim() || undefined,
      platform,
      sourceUrl: cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`,
      creatorHandle: creatorHandle.trim()
        ? creatorHandle.trim().startsWith('@')
          ? creatorHandle.trim()
          : `@${creatorHandle.trim()}`
        : '@saved.creator',
      creatorName: creatorHandle.trim().replace(/^@/, '') || 'Creator',
      coverImage: resolvedCoverImage,
      prepMinutes: Number(prepMinutes) || 10,
      cookMinutes: Number(cookMinutes) || 10,
      servings: Number(servings) || 2,
      difficulty: editingRecipe?.difficulty ?? 'Easy',
      tags: finalTags.length > 0 ? finalTags : [formatPlatformLabel(platform, lang)],
      summary:
        summary.trim() ||
        `${formatPlatformLabel(platform, lang)} · ${finalSteps.length} ${t.card.cues}`,
      ingredients: ingredients.filter((i) => i.item.trim()),
      steps: finalSteps,
      transcript: finalTranscript.map((tr) => ({
        ...tr,
        text:
          tr.text.trim() ||
          finalSteps.find((s) => s.stepNumber === tr.linkedStepNumber)?.instruction ||
          '',
      })),
      savedAt: editingRecipe?.savedAt ?? new Date().toISOString(),
      isFavorite: editingRecipe?.isFavorite ?? true,
      isCustom: editingRecipe?.isCustom ?? true,
      videoDurationSec: lastSec,
    };

    onSaveRecipe(savedRecipe);
    resetForm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-recipe-title"
    >
      <div className="w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl pb-safe">
        <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-3 sm:hidden" />

        <div className="flex items-center justify-between px-5 sm:px-6 pt-4 sm:pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0 pe-3">
            <h2 id="import-recipe-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {isEditing ? t.importer.editModalTitle : t.importer.modalTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEditing ? t.importer.editModalSubtitle : t.importer.modalSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] -me-2 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {initialShared?.url && editingRecipe && (
            <p className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-3 text-xs leading-relaxed text-emerald-800 dark:text-emerald-200">
              {lang === 'he'
                ? 'הקישור נשמר בספרייה כטיוטה. החילוץ מתבצע עכשיו; אפשר לסגור כדי לראות אותו או לשמור את הפרטים שחולצו.'
                : 'The shared link is already saved in your recipe library as a draft. Extraction is running; close this dialog to see it, or save your extracted details when ready.'}
            </p>
          )}
          {/* Format templates (create mode) */}
          {!isEditing && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.importer.loadTemplate}
              </span>
              {(['instagram', 'tiktok', 'facebook', 'youtube'] as SocialPlatform[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => loadSample(p)}
                  className="min-h-[36px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
                >
                  <PlatformIcon platform={p} className="w-3.5 h-3.5" />
                  <span>{formatPlatformLabel(p, lang)}</span>
                </button>
              ))}
            </div>
          )}

          {/* URL + Auto Link Extraction + Platform */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.importer.urlLabel}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      dir="ltr"
                      value={sourceUrl}
                      onChange={(e) => handleUrlChange(e.target.value, false)}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData('text');
                        if (pasted) {
                          window.setTimeout(() => handleUrlChange(pasted, true), 0);
                        }
                      }}
                      placeholder="https://www.youtube.com/watch?v=... / tiktok.com/..."
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 ps-10 pe-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void runLinkExtraction(sourceUrl, { forceThumbnail: true, replaceAll: true })
                    }
                    disabled={isFetchingLink}
                    className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                  >
                    {isFetchingLink ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span>{isFetchingLink ? t.importer.fetchingBtn : t.importer.fetchBtn}</span>
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {t.importer.urlHint}
                </p>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.importer.platformLabel}
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                  {(['instagram', 'tiktok', 'facebook', 'youtube'] as SocialPlatform[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      aria-label={formatPlatformLabel(p, lang)}
                      className={`min-h-[36px] rounded-lg flex items-center justify-center transition ${
                        platform === p
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <PlatformIcon platform={p} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {linkStatus && (
              <p
                className={`text-xs font-medium px-3 py-2 rounded-xl ${
                  linkStatus.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                }`}
              >
                {linkStatus.text}
              </p>
            )}
          </div>

          {/* Recipe Title (Dish Name), Original Video Name & Creator */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.importer.titleLabel}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    titleEditedByUser.current = e.target.value.trim().length > 0;
                    setTitle(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder={t.importer.titlePlaceholder}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.importer.creatorLabel}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={creatorHandle}
                  onChange={(e) => setCreatorHandle(e.target.value)}
                  placeholder={t.importer.creatorPlaceholder}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.importer.videoTitleLabel}
              </label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => {
                  videoTitleEditedByUser.current = e.target.value.trim().length > 0;
                  setVideoTitle(e.target.value);
                }}
                placeholder={t.importer.videoTitlePlaceholder}
                className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950 px-3.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Interactive Tag Editor (Meal Type + Dish Created, Properly Spaced) */}
          <div className="space-y-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-950/40">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              {t.importer.tagsLabel}
            </label>

            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 ps-2.5 pe-1 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove ${tag}`}
                      className="min-h-[26px] min-w-[26px] flex items-center justify-center rounded-md text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTagFromInput(newTagInput);
                  }
                }}
                placeholder={t.importer.tagsPlaceholder}
                className="flex-1 min-w-0 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => addTagFromInput(newTagInput)}
                className="min-h-[42px] px-3.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-xs font-semibold text-white hover:bg-emerald-600 transition inline-flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.importer.addTagBtn}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {t.importer.quickMealTags.map((mealTag) => {
                const active = tags.some((existing) => existing.toLowerCase() === mealTag.toLowerCase());
                return (
                  <button
                    key={mealTag}
                    type="button"
                    onClick={() => toggleQuickTag(mealTag)}
                    className={`min-h-[34px] px-2.5 rounded-lg text-xs font-medium border transition ${
                      active
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                    }`}
                  >
                    {active ? '✓ ' : '+ '}
                    {mealTag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timing & Servings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.importer.timeLabel}
              </label>
              <input
                type="number"
                min={1}
                value={prepMinutes + cookMinutes}
                onChange={(e) => {
                  const total = Math.max(1, Number(e.target.value));
                  setPrepMinutes(Math.floor(total / 2));
                  setCookMinutes(Math.ceil(total / 2));
                }}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.importer.servingsLabel}
              </label>
              <input
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(Math.max(1, Number(e.target.value)))}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Transcript / Caption / Description Extractor */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-800/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t.importer.pasteLabel}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {audioUrl && (
                  <button
                    type="button"
                    disabled={isTranscribingAudio || isFetchingLink}
                    onClick={() => {
                      const reqSeq = ++extractionSeqRef.current;
                      void runStage2AudioTranscription(audioUrl, {
                        requestSeq: reqSeq,
                        captionContext: rawPasteText || videoTitle,
                        explicitVideoTitle: videoTitle || title,
                        durationHint: videoDurationHint,
                      });
                    }}
                    className="min-h-[38px] px-3 rounded-lg border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {isTranscribingAudio ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mic className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isTranscribingAudio ? t.importer.transcribingBtn : t.importer.transcribeAudioBtn}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    applyParsedText(rawPasteText, {
                      overrideTitleIfEmpty: true,
                      explicitVideoTitle: videoTitle || undefined,
                      clearWhenEmpty: !hasExplicitDesc && rawPasteText.trim().length === 0,
                    })
                  }
                  className="min-h-[38px] px-3 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t.importer.extractBtn}</span>
                </button>
              </div>
            </div>
            <textarea
              rows={5}
              value={rawPasteText}
              onChange={(e) => {
                const next = e.target.value;
                setRawPasteText(next);
                rawPasteTextRef.current = next;
                if (next.trim().length > 24 && !isEditing) {
                  applyParsedText(next, { overrideTitleIfEmpty: true });
                }
              }}
              placeholder={t.importer.pastePlaceholder}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {parseFeedback && (
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {parseFeedback}
              </p>
            )}
          </div>

          {/* Cover Photo Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.importer.thumbLabel}
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 cursor-pointer hover:underline">
                <Upload className="w-3.5 h-3.5" />
                <span>{t.importer.uploadPhoto}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {extractedVideoCover && (
                <button
                  type="button"
                  onClick={() => {
                    userPickedCustomThumb.current = false;
                    setCoverImage(extractedVideoCover);
                  }}
                  className={`relative w-20 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                    coverImage === extractedVideoCover
                      ? 'border-emerald-600'
                      : 'border-slate-300 dark:border-slate-600 opacity-80 hover:opacity-100'
                  }`}
                >
                  <RecipeImage
                    src={extractedVideoCover}
                    alt={t.importer.videoThumbLabel}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[10px] font-semibold text-white text-center py-0.5 truncate px-1">
                    {t.importer.videoThumbLabel}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  userPickedCustomThumb.current = true;
                  setCoverImage('');
                }}
                className={`h-12 px-3 rounded-xl text-xs font-medium shrink-0 border-2 transition ${
                  coverImage === ''
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {t.importer.none}
              </button>
              {COVER_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    userPickedCustomThumb.current = true;
                    setCoverImage(preset.url);
                  }}
                  className={`relative w-16 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                    coverImage === preset.url
                      ? 'border-emerald-600'
                      : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <RecipeImage src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Editable Ingredients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t.importer.ingredientsCount(ingredients.filter((i) => i.item.trim()).length)}
              </span>
              <button
                type="button"
                onClick={() =>
                  setIngredients((prev) => [
                    ...prev,
                    { id: `ing-${Date.now()}`, amount: null, unit: '', item: '' },
                  ])
                }
                className="min-h-[36px] px-2.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.importer.addIngredient}</span>
              </button>
            </div>

            <div className="space-y-2">
              {ingredients.map((ing, idx) => (
                <div key={ing.id} className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    value={ing.amount ?? ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? null : Number(e.target.value);
                      setIngredients((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, amount: v } : item))
                      );
                    }}
                    placeholder={t.importer.qtyPlaceholder}
                    className="w-16 min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-xs font-mono tabular-nums text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) =>
                      setIngredients((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, unit: e.target.value } : item))
                      )
                    }
                    placeholder={t.importer.unitPlaceholder}
                    className="w-16 min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-xs text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={ing.item}
                    onChange={(e) =>
                      setIngredients((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, item: e.target.value } : item))
                      )
                    }
                    placeholder={t.importer.ingNamePlaceholder}
                    className="flex-1 min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 text-xs text-slate-900 dark:text-white"
                  />
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setIngredients((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="Remove ingredient"
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Editable Linked Steps */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t.importer.stepsCount(steps.length)}
              </span>
              <button
                type="button"
                onClick={() => {
                  const nextNum = steps.length + 1;
                  const nextTs = (steps[steps.length - 1]?.linkedTimestampSec ?? 0) + 15;
                  setSteps((prev) => [
                    ...prev,
                    {
                      id: `step-${Date.now()}`,
                      stepNumber: nextNum,
                      title: t.detail.stepLabel(nextNum),
                      instruction: '',
                      linkedTimestampSec: nextTs,
                    },
                  ]);
                  setTranscript((prev) => [
                    ...prev,
                    {
                      id: `tr-${Date.now()}`,
                      startSec: nextTs,
                      endSec: nextTs + 12,
                      text: '',
                      linkedStepNumber: nextNum,
                      prepCue: t.detail.stepLabel(nextNum),
                    },
                  ]);
                }}
                className="min-h-[36px] px-2.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.importer.addStep}</span>
              </button>
            </div>

            {steps.map((step, idx) => (
              <div
                key={step.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    dir="ltr"
                    value={formatTimestamp(step.linkedTimestampSec)}
                    onChange={(e) => {
                      const sec = parseTimestampToSec(e.target.value);
                      setSteps((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, linkedTimestampSec: sec } : s))
                      );
                      setTranscript((prev) =>
                        prev.map((tr) =>
                          tr.linkedStepNumber === idx + 1 ? { ...tr, startSec: sec, endSec: sec + 12 } : tr
                        )
                      );
                    }}
                    aria-label={`Timestamp for step ${idx + 1}`}
                    className="w-20 min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 text-xs font-mono tabular-nums text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={step.instruction}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSteps((prev) =>
                        prev.map((s, i) =>
                          i === idx
                            ? {
                                ...s,
                                instruction: val,
                                title: val.split(/[.,!]/)[0].slice(0, 42) || t.detail.stepLabel(idx + 1),
                              }
                            : s
                        )
                      );
                      setTranscript((prev) =>
                        prev.map((tr) =>
                          tr.linkedStepNumber === idx + 1 && !tr.text ? { ...tr, text: val } : tr
                        )
                      );
                    }}
                    placeholder={t.importer.stepPlaceholder}
                    className="flex-1 min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 text-xs text-slate-900 dark:text-white"
                  />
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSteps((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="Remove step"
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {errorMsg && <p className="text-xs font-semibold text-rose-600">{errorMsg}</p>}

          <div className="pt-2 pb-safe flex flex-wrap items-center justify-between gap-3">
            <div>
              {isEditing && editingRecipe && onDeleteRecipe && (
                confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteRecipe(editingRecipe.id);
                        resetForm();
                        onClose();
                      }}
                      className="min-h-[44px] px-4 rounded-xl bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 inline-flex items-center gap-1.5 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t.importer.confirmDeleteBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
                      {t.importer.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="min-h-[44px] px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 inline-flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{t.importer.deleteBtn}</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-3 ms-auto">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[48px] px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {t.importer.cancel}
              </button>
              <button
                type="submit"
                className="min-h-[48px] px-6 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 transition"
              >
                {isEditing ? t.importer.saveChangesBtn : t.importer.saveBtn}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
