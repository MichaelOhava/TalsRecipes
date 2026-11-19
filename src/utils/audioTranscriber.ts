import { Language } from '../types/recipe';

export type TranscriptionProgressCallback = (status: {
  stage: 'downloading' | 'transcribing' | 'done';
  message: string;
  progressPercent?: number;
}) => void;

export interface WhisperTranscriptResult {
  rawTranscript: string;
  timestampedLines: Array<{ startSec: number; endSec: number; text: string }>;
  durationSec: number;
}

interface TransformersModule {
  env: {
    allowLocalModels: boolean;
    useBrowserCache: boolean;
    backends?: {
      onnx?: {
        wasm?: {
          numThreads?: number;
          proxy?: boolean;
        };
      };
    };
  };
  pipeline: (
    task: string,
    model: string,
    options?: Record<string, unknown>
  ) => Promise<unknown>;
}

const WHISPER_MODEL_ID = 'onnx-community/whisper-base';
const MAX_TRANSCRIBE_SECONDS = 120;
const TRANSCRIPTION_TIMEOUT_MS = 65000;

let cachedAsrPipeline: unknown = null;
let loadingAsrPromise: Promise<unknown> | null = null;

async function loadTransformers(): Promise<TransformersModule> {
  const mod = (await import('@huggingface/transformers')) as unknown as TransformersModule;
  if (mod.env) {
    mod.env.allowLocalModels = false;
    mod.env.useBrowserCache = true;
    const wasmCfg = mod.env.backends?.onnx?.wasm;
    if (wasmCfg) {
      wasmCfg.proxy = false;
      // Non-COOP/COEP iframes & GitHub Pages lack SharedArrayBuffer; force single-threaded WASM so workers never hang/OOM
      if (typeof globalThis.crossOriginIsolated === 'boolean' && !globalThis.crossOriginIsolated) {
        wasmCfg.numThreads = 1;
      }
    }
  }
  return mod;
}

function formatTimeCue(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

/**
 * Decodes an MP3/MP4/WAV audio URL in the browser and resamples to 16 kHz mono Float32 PCM
 * using native Web Audio APIs (zero FFmpeg WASM required, works statically on GitHub Pages).
 */
export async function decodeAudioUrlTo16kPcm(audioUrl: string): Promise<{
  pcm: Float32Array;
  durationSec: number;
}> {
  const controller = new AbortController();
  const fetchTimer = globalThis.setTimeout(() => controller.abort(), 15000);
  let arrayBuffer: ArrayBuffer;
  try {
    const response = await fetch(audioUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Audio fetch failed (${response.status})`);
    }
    arrayBuffer = await response.arrayBuffer();
  } finally {
    globalThis.clearTimeout(fetchTimer);
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('Web Audio API unavailable in this browser.');
  }

  const audioCtx = new AudioCtx();
  try {
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    const targetRate = 16000;
    const clampedDuration = Math.min(decoded.duration, MAX_TRANSCRIBE_SECONDS);
    const targetLength = Math.max(1, Math.ceil(clampedDuration * targetRate));
    const offlineCtx = new OfflineAudioContext(1, targetLength, targetRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0, 0, clampedDuration);
    const rendered = await offlineCtx.startRendering();
    const channelData = rendered.getChannelData(0);
    return {
      pcm: new Float32Array(channelData),
      durationSec: Math.max(1, Math.round(decoded.duration)),
    };
  } finally {
    await audioCtx.close().catch(() => undefined);
  }
}

async function getOrLoadWhisperPipeline(
  isHeUi: boolean,
  onProgress?: TranscriptionProgressCallback
): Promise<unknown> {
  if (cachedAsrPipeline) return cachedAsrPipeline;
  if (loadingAsrPromise) return loadingAsrPromise;

  loadingAsrPromise = (async () => {
    const { pipeline } = await loadTransformers();
    const instance = await pipeline('automatic-speech-recognition', WHISPER_MODEL_ID, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (ev: { status?: string; progress?: number }) => {
        if (typeof ev?.progress === 'number') {
          onProgress?.({
            stage: 'downloading',
            message: isHeUi
              ? `מוריד מודל תמלול קל לדפדפן (${Math.round(ev.progress)}%)...`
              : `Loading compact speech model (${Math.round(ev.progress)}%)...`,
            progressPercent: Math.round(ev.progress),
          });
        }
      },
    });
    cachedAsrPipeline = instance;
    return instance;
  })();

  try {
    return await loadingAsrPromise;
  } finally {
    loadingAsrPromise = null;
  }
}

/**
 * Runs free, open-source Whisper-base (73 MB q8 WASM) speech-to-text transcription in the browser.
 * Used exclusively as a fallback when a video description contains no recipe instructions or ingredients.
 */
export async function transcribeAudioWithBrowserWhisper(
  audioUrl: string,
  options: {
    lang: Language;
    hintText?: string;
    shouldAbort?: () => boolean;
    onProgress?: TranscriptionProgressCallback;
  }
): Promise<WhisperTranscriptResult> {
  const isHeUi = options.lang === 'he';
  const hasHebrewHint = /[\u0590-\u05FF]/.test(options.hintText || '');
  const whisperLang = hasHebrewHint ? 'he' : options.lang === 'en' ? 'en' : undefined;

  options.onProgress?.({
    stage: 'downloading',
    message: isHeUi
      ? 'מכין תמלול אוטומטי מהסרטון בדפדפן (ללא API חיצוני)...'
      : 'Preparing in-browser audio transcription (free & offline-cached)...',
    progressPercent: 10,
  });

  // Decode lightweight audio stream first so CORS/network issues fail fast before downloading Whisper weights
  const { pcm, durationSec } = await decodeAudioUrlTo16kPcm(audioUrl);
  if (options.shouldAbort?.()) {
    throw new Error('Transcription aborted');
  }

  const asrInstance = await getOrLoadWhisperPipeline(isHeUi, options.onProgress);
  if (options.shouldAbort?.()) {
    throw new Error('Transcription aborted');
  }

  options.onProgress?.({
    stage: 'transcribing',
    message: isHeUi
      ? 'מתמלל את פס הקול של הסרטון ומחלץ שלבים עם תזמונים...'
      : 'Transcribing spoken audio into timestamped cooking steps...',
    progressPercent: 70,
  });

  const asr = asrInstance as (
    audio: Float32Array,
    cfg: Record<string, unknown>
  ) => Promise<{
    text?: string;
    chunks?: Array<{ timestamp?: [number | null, number | null]; text?: string }>;
  }>;

  let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      reject(new Error('Audio transcription timed out'));
    }, TRANSCRIPTION_TIMEOUT_MS);
  });

  const output = await Promise.race([
    asr(pcm, {
      ...(whisperLang ? { language: whisperLang } : {}),
      task: 'transcribe',
      return_timestamps: true,
      chunk_length_s: 25,
      stride_length_s: 2,
    }),
    timeoutPromise,
  ]).finally(() => {
    if (timeoutId !== null) globalThis.clearTimeout(timeoutId);
  });

  if (options.shouldAbort?.()) {
    throw new Error('Transcription aborted');
  }

  const rawChunks = (output.chunks || [])
    .map((chunk, idx) => {
      const start =
        typeof chunk.timestamp?.[0] === 'number' ? Math.max(0, chunk.timestamp[0]) : idx * 5;
      const end =
        typeof chunk.timestamp?.[1] === 'number'
          ? Math.max(start + 1, chunk.timestamp[1])
          : Math.min(durationSec, start + 5);
      return {
        startSec: Math.round(start),
        endSec: Math.round(end),
        text: (chunk.text || '').trim(),
      };
    })
    .filter((c) => c.text.length > 0);

  // Merge fragmented micro-chunks into coherent culinary cues (6-16s)
  const merged: Array<{ startSec: number; endSec: number; text: string }> = [];
  for (const chunk of rawChunks) {
    const prev = merged[merged.length - 1];
    const shouldMerge =
      prev &&
      (prev.text.split(/\s+/).length < 6 || chunk.text.split(/\s+/).length <= 3) &&
      chunk.endSec - prev.startSec <= 16;

    if (shouldMerge) {
      prev.text = `${prev.text} ${chunk.text}`.replace(/\s+/g, ' ').trim();
      prev.endSec = Math.max(prev.endSec, chunk.endSec);
    } else {
      merged.push({ ...chunk });
    }
  }

  const timestampedLines =
    merged.length > 0
      ? merged
      : output.text?.trim()
        ? [{ startSec: 0, endSec: durationSec, text: output.text.trim() }]
        : [];

  const formattedTranscript = timestampedLines
    .map((line) => `[${formatTimeCue(line.startSec)}] ${line.text}`)
    .join('\n');

  options.onProgress?.({
    stage: 'done',
    message: isHeUi
      ? `התמלול הושלם (${timestampedLines.length} מקטעים מתוזמנים).`
      : `Audio transcription complete (${timestampedLines.length} timestamped segments).`,
    progressPercent: 100,
  });

  return {
    rawTranscript: formattedTranscript || output.text || '',
    timestampedLines,
    durationSec,
  };
}
