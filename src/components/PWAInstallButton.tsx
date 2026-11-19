import React, { useState } from 'react';
import { Download, Share, Smartphone, PlusSquare, CheckCircle2, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { getCopy } from '../i18n/translations';
import { Language } from '../types/recipe';

interface PWAInstallButtonProps {
  lang: Language;
  variant?: 'compact' | 'full';
  alwaysShowGuideOption?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang,
  variant = 'compact',
  alwaysShowGuideOption = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const t = getCopy(lang);

  if (isInstalled && !alwaysShowGuideOption) {
    return null;
  }

  if (isInstalled && alwaysShowGuideOption) {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>{t.pwa.installedBadge}</span>
      </div>
    );
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          variant === 'full'
            ? 'w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-[0.99] transition whitespace-nowrap'
            : 'min-h-[44px] flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition whitespace-nowrap shrink-0'
        }
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{t.pwa.installApp}</span>
      </button>
    );
  }

  if (isIOS || alwaysShowGuideOption) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            variant === 'full'
              ? 'w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition whitespace-nowrap'
              : 'min-h-[44px] flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition whitespace-nowrap shrink-0'
          }
        >
          <Smartphone className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{t.pwa.iphoneGuideBtn}</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800">
              <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 id="ios-install-title" className="text-lg font-bold text-slate-900 dark:text-white">
                    {t.pwa.iosTitle}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {t.pwa.iosSubtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close"
                  className="min-h-[44px] min-w-[44px] -mt-2 -me-2 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <ol className="mt-5 space-y-4 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    1
                  </span>
                  <div className="pt-0.5">{t.pwa.iosStep1}</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    2
                  </span>
                  <div className="pt-0.5 flex items-center flex-wrap gap-1.5">
                    <span>{t.pwa.iosStep2Prefix}</span>
                    <Share className="w-4 h-4 inline text-blue-600 dark:text-blue-400" />
                    <strong>{t.pwa.iosStep2Bold}</strong>
                    <span>{t.pwa.iosStep2Suffix}</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    3
                  </span>
                  <div className="pt-0.5 flex items-center flex-wrap gap-1.5">
                    <span>{t.pwa.iosStep3Prefix}</span>
                    <PlusSquare className="w-4 h-4 inline text-slate-700 dark:text-slate-200" />
                    <strong>{t.pwa.iosStep3Bold}</strong>
                    <span>{t.pwa.iosStep3Suffix}</span>
                  </div>
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full min-h-[48px] rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition"
              >
                {t.pwa.gotIt}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
