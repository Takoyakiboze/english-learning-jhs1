import type { Page } from '@playwright/test';

declare global {
  interface Window {
    __speechTest: {
      calls: { text: string; language: string; rate: number; activated: boolean }[];
      pending: SpeechSynthesisUtterance[];
      cancellations: number;
      failNext: boolean;
    };
  }
}

// Headless CI has no reliable installed voices. Verify the actual browser speech
// requests and events without depending on an audio device or a cloud voice.
export async function installSpeechMock(page: Page) {
  await page.addInitScript(() => {
    const state: Window['__speechTest'] = { calls: [], pending: [], cancellations: 0, failNext: false };
    window.__speechTest = state;
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      speak(utterance: SpeechSynthesisUtterance) {
        state.calls.push({ text: utterance.text, language: utterance.lang, rate: utterance.rate, activated: navigator.userActivation.isActive });
        state.pending.push(utterance);
        if (state.failNext) {
          state.failNext = false;
          queueMicrotask(() => utterance.dispatchEvent(new Event('error')));
        }
      },
      cancel() {
        const previous = state.pending;
        state.pending = [];
        state.cancellations++;
        // Some browsers report canceled utterances as errors. Old callbacks
        // must not replace the state of the new replay with an error.
        for (const utterance of previous) utterance.dispatchEvent(new Event('error'));
      },
      getVoices: () => [],
    } });
  });
}
