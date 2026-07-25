import { useState, useEffect, useRef, useCallback } from 'react';
import { normalizeTypingText } from '@/utils/textNormalize';
import { compareClusters } from '@/utils/banglaGraphemes';

export function useTypingEngine(targetText: string, durationLimitSeconds: number = 30) {
  const [typedText, setTypedText] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationLimitSeconds);
  const [totalAttempts, setTotalAttempts] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pauseStartRef = useRef<number | null>(null);

  const startTicking = useCallback(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsCompleted(true);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Reset engine — clears all state and restarts with new duration
  const resetEngine = useCallback((newDuration?: number) => {
    const dur = newDuration ?? durationLimitSeconds;
    setTypedText('');
    setIsStarted(false);
    setIsCompleted(false);
    setTimeLeft(dur);
    setTotalAttempts(0);
    startTimeRef.current = null;
    pauseStartRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [durationLimitSeconds]);

  // Pause/resume the countdown (and shift the elapsed-time baseline on
  // resume) so switching tabs or losing focus mid-test doesn't burn down
  // the timer or count against WPM/accuracy — previously the interval kept
  // ticking and elapsed time kept accruing regardless of focus.
  const setPaused = useCallback((paused: boolean) => {
    if (!isStarted || isCompleted) return;

    if (paused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (pauseStartRef.current === null) {
        pauseStartRef.current = Date.now();
      }
    } else {
      if (pauseStartRef.current !== null) {
        const pausedMs = Date.now() - pauseStartRef.current;
        if (startTimeRef.current !== null) {
          startTimeRef.current += pausedMs;
        }
        pauseStartRef.current = null;
      }
      if (!timerRef.current) {
        startTicking();
      }
    }
  }, [isStarted, isCompleted, startTicking]);

  // Handle typing input changes
  const handleInputChange = useCallback((rawValue: string) => {
    if (isCompleted) return;

    // Normalize before comparing anything against targetText — some Bangla
    // input methods (Bijoy Unicode among them) can emit a precomposed
    // nukta letter or wrap a conjunct in invisible joiners, either of which
    // would otherwise never byte-match a target string built from the same
    // normalized form. See utils/textNormalize.ts for the full rationale.
    const value = normalizeTypingText(rawValue);

    // Start timer on first keystroke
    if (!isStarted && value.length > 0) {
      setIsStarted(true);
      startTimeRef.current = Date.now();
      startTicking();
    }

    // Track total keystrokes (forward only, not backspace). Counted in code
    // units added (not a flat +1 per input event) because NFC normalization
    // can expand a single keystroke into two code units — Bengali RRA/RHA/YYA
    // (ড়/ঢ়/য়) are Unicode "composition exclusions", so a Bijoy Unicode
    // layout emitting one as a single precomposed codepoint still normalizes
    // to a 2-code-unit base-consonant+nukta sequence here. A flat +1 would
    // undercount attempts relative to correctChars/incorrectChars (which are
    // also code-unit-scored, see compareClusters), inflating accuracy% for
    // any Bangla text containing those letters. Checking targetChar against
    // the FIRST new position (not the last) keeps the strict-space check
    // correct regardless of how many code units this event actually added.
    const delta = value.length - typedText.length;
    if (delta > 0) {
      const firstNewChar = value[typedText.length];
      const targetChar = targetText[typedText.length];

      setTotalAttempts((prev) => prev + delta);

      // STRICT SPACE RULE: If the target character is a space,
      // and the typed character is NOT a space, do not advance the input.
      if (targetChar === ' ' && firstNewChar !== ' ') {
        return;
      }
    }

    // Clamp to target length — do NOT auto-complete; rely on timer
    setTypedText(value.length > targetText.length ? value.substring(0, targetText.length) : value);
  }, [isStarted, isCompleted, typedText, targetText, startTicking]);

  // Sync timeLeft when durationLimitSeconds changes before test starts
  useEffect(() => {
    if (!isStarted && !isCompleted) {
      // eslint-disable-next-line
      setTimeLeft(durationLimitSeconds);
    }
  }, [durationLimitSeconds, isStarted, isCompleted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Compute live stats ─────────────────────────────────────────────────────
  // Scored per grapheme cluster (a whole Bangla conjunct, or a single code
  // unit for everything else) so a typo inside a conjunct counts the whole
  // conjunct wrong instead of just the one code unit that differs — this
  // keeps accuracy/WPM in agreement with the per-conjunct coloring shown in
  // the typing UI. No-op for English/Latin text.
  const { correctChars, incorrectChars } = compareClusters(typedText, targetText);

  // eslint-disable-next-line
  const timeElapsed = startTimeRef.current
    // eslint-disable-next-line
    ? (Date.now() - startTimeRef.current) / 1000
    : 0;

  const effectiveTime = timeElapsed > 0 ? timeElapsed : 0.001;

  // WPM = (correct chars / 5) / minutes elapsed
  const rawWpm = (correctChars / 5) / (effectiveTime / 60);
  const wpm = Math.max(0, Math.round(rawWpm));

  // Accuracy = correct keystrokes / total keystrokes
  const accuracy = totalAttempts > 0
    ? Math.min(100, Math.round((correctChars / totalAttempts) * 100))
    : 100;

  return {
    typedText,
    isStarted,
    isCompleted,
    timeLeft,
    totalAttempts,
    correctChars,
    incorrectChars,
    wpm,
    accuracy,
    timeElapsed: Math.round(effectiveTime),
    handleInputChange,
    resetEngine,
    setPaused,
  };
}
