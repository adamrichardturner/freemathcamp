import { evaluate, generateProblem, type Problem } from "@fmc/curriculum";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInRight, FadeOutLeft, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { domProps } from "@/components/rich";
import { SessionSummaryView } from "@/components/session-summary";
import { Button, Card, Icon, Input, Text } from "@/components/ui";
import ProblemContent from "@/dom/problem-content";
import { api, type AttemptResponse, type PracticeItem, type PracticeMode, type Resolution, type RevealResponse, type SessionSummary, type StartPracticeResponse } from "@/lib/api";
import { COURSE_ID, exerciseRef } from "@/lib/course";
import { plainTex } from "@/lib/plain";
import { useInvalidateLearner } from "@/lib/queries";
import { playSound, preloadSounds } from "@/lib/sound";
import { alpha, radius, useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { widths } from "@/lib/layout";

type ItemState = { phase: "answering" } | { phase: "resolved"; correct: boolean; resolution: Resolution; revealedAnswer?: string };
interface ItemResult {
  struggle: number;
  cleanSolve: boolean;
  revealed: boolean;
}

const LEVEL_LABEL = { 1: "Warm-up", 2: "Core", 3: "Stretch" } as const;

/** A practice session, as the web's PracticeSession: adaptive problems marked by the API, then a summary. */
export default function Practice() {
  const { id, mode = "learn" } = useLocalSearchParams<{ id: string; mode?: PracticeMode }>();
  const ref = exerciseRef(id)!;
  const { c } = useTheme();
  const invalidate = useInvalidateLearner();
  const [session, setSession] = useState<StartPracticeResponse | null>(null);
  const [item, setItem] = useState<PracticeItem | null>(null);
  const [state, setState] = useState<ItemState>({ phase: "answering" });
  const [results, setResults] = useState<ItemResult[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [mastery, setMastery] = useState(0);

  const start = useMutation({
    mutationFn: () => api.post<StartPracticeResponse>("/practice", { courseId: COURSE_ID, exerciseId: id, mode }),
    onSuccess: (s) => {
      setSession(s);
      setItem(s.item);
      setMastery(s.mastery);
      setState({ phase: "answering" });
      setResults([]);
      setSummary(null);
    },
    onError: (e) => {
      toast.error(e, "Couldn't start practice.");
      router.back();
    },
  });

  const complete = useMutation({
    mutationFn: () => api.post<SessionSummary>(`/practice/${session!.sessionId}/complete`),
    onSuccess: (s) => {
      setSummary(s);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void invalidate();
    },
    onError: (e) => toast.error(e, "Couldn't save your session."),
  });

  // Start exactly once: a second start would abandon the first session server-side.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start.mutate();
    preloadSounds();
  });

  const problem = useMemo(() => (item ? generateProblem(ref, item.seed, item.level) : null), [item, ref]);

  const onResolved = (correct: boolean, resolution: Resolution, revealedAnswer?: string) => {
    setState({ phase: "resolved", correct, resolution, revealedAnswer });
    setMastery(resolution.mastery.after);
    setResults((r) => [...r, { struggle: resolution.struggle, cleanSolve: resolution.cleanSolve, revealed: !!revealedAnswer }]);
  };

  const next = () => {
    if (state.phase !== "resolved") return;
    const r = state.resolution;
    if (r.done || !r.next) return complete.mutate();
    if (r.levelChange > 0) toast.success(`Stepping up to ${LEVEL_LABEL[r.next.level]} problems`, "up");
    if (r.levelChange < 0) toast.info(`Easing back to ${LEVEL_LABEL[r.next.level]} problems`, "down");
    setItem(r.next);
    setState({ phase: "answering" });
  };

  const exit = () => router.back();
  // iPadOS doesn't count the keyboard's shortcut bar, which would otherwise cover the Check bar.

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top", "bottom", "left", "right"]}>
      {/* One readable column; on an iPad the problem doesn't stretch across the screen. */}
      <View style={{ flex: 1, width: "100%", maxWidth: widths.readable, alignSelf: "center" }}>
      {summary ? (
        <SessionSummaryView summary={summary} restarting={start.isPending} onAgain={() => !start.isPending && start.mutate()} onExit={exit} />
      ) : !session || !item || !problem ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.mutedForeground} />
        </View>
      ) : (
        <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === "ios" && Platform.isPad ? 56 : 0} style={{ flex: 1 }}>
          <SessionHeader total={session.targetItems} results={results} current={item.index} level={item.level} mastery={mastery} mode={mode} onExit={exit} />
          <Animated.View key={item.seed} entering={FadeInRight.duration(250)} exiting={FadeOutLeft.duration(150)} style={{ flex: 1 }}>
            <ProblemCard sessionId={session.sessionId} exerciseId={id} item={item} problem={problem} state={state} onResolved={onResolved} onNext={next} finishing={complete.isPending} />
          </Animated.View>
        </KeyboardAvoidingView>
      )}
      </View>
    </SafeAreaView>
  );
}

function SessionHeader({ total, results, current, level, mastery, mode, onExit }: { total: number; results: ItemResult[]; current: number; level: 1 | 2 | 3; mastery: number; mode: PracticeMode; onExit: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable onPress={onExit} hitSlop={12} accessibilityLabel="Exit practice" style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.muted, alignItems: "center", justifyContent: "center" }}>
          <Icon name="xmark" size={14} weight="bold" color={c.mutedForeground} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: "row", gap: 5 }}>
          {Array.from({ length: total }, (_, i) => {
            const r = results[i];
            const bg = r ? (r.revealed ? alpha(c.danger, 0.7) : r.cleanSolve ? c.success : r.struggle > 0.5 ? c.warning : alpha(c.success, 0.6)) : i === current ? alpha(c.primary, 0.5) : c.muted;
            return <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: bg }} />;
          })}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label={mode === "challenge" ? "Challenge" : mode === "review" ? "Review" : "Learn"} />
        <View style={{ flexDirection: "row", alignItems: "center", borderRadius: 999, backgroundColor: alpha(c.primary, 0.1), paddingHorizontal: 9, paddingVertical: 4 }}>
          <Text variant="caption" weight="semibold" tone="primary">
            {"★".repeat(level)}
            <Text variant="caption" style={{ color: alpha(c.primary, 0.4) }}>
              {"★".repeat(3 - level)}
            </Text>{" "}
            {LEVEL_LABEL[level]}
          </Text>
        </View>
        <Chip label={`Mastery ${Math.round(mastery * 100)}%`} />
      </View>
    </View>
  );
}

function Chip({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ borderRadius: 999, backgroundColor: c.muted, paddingHorizontal: 9, paddingVertical: 4 }}>
      <Text variant="caption" weight="medium">
        {label}
      </Text>
    </View>
  );
}

function ProblemCard({
  sessionId,
  exerciseId,
  item,
  problem,
  state,
  onResolved,
  onNext,
  finishing,
}: {
  sessionId: string;
  exerciseId: string;
  item: PracticeItem;
  problem: Problem;
  state: ItemState;
  onResolved: (correct: boolean, r: Resolution, revealed?: string) => void;
  onNext: () => void;
  finishing: boolean;
}) {
  const { c, scheme } = useTheme();
  const [answer, setAnswer] = useState("");
  const [choice, setChoice] = useState<number | null>(null);
  const [hints, setHints] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const resolved = state.phase === "resolved";
  const isChoice = problem.answer.kind === "choice";
  const elapsed = () => Date.now() - startedAt;

  // Resolving reveals the worked solution below; bring it into view.
  useEffect(() => {
    if (resolved) setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 350);
  }, [resolved]);

  const attempt = useMutation({
    mutationFn: (value: string) => api.post<AttemptResponse>(`/practice/${sessionId}/attempts`, { index: item.index, answer: value, timeMs: elapsed(), hintsUsed: hints }),
    onSuccess: (r) => {
      playSound(r.correct ? "correct" : "wrong");
      void Haptics.notificationAsync(r.correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
      if (r.correct) return onResolved(true, r);
      setWrong(r.wrongAttempts);
      setFeedback(r.feedback ?? (r.wrongAttempts >= 2 ? "Not quite. Try a hint, or reveal the solution." : "Not quite — have another go."));
      shake.value = withSequence(withTiming(-10, { duration: 60 }), withTiming(10, { duration: 70 }), withTiming(-6, { duration: 70 }), withTiming(6, { duration: 70 }), withSpring(0));
    },
    onError: (e) => toast.error(e, "Couldn't check that answer."),
  });

  const reveal = useMutation({
    mutationFn: () => api.post<RevealResponse>(`/practice/${sessionId}/reveal`, { index: item.index, timeMs: elapsed(), hintsUsed: hints }),
    onSuccess: (r) => onResolved(false, r, r.answer),
    onError: (e) => toast.error(e, "Couldn't reveal the answer."),
  });

  // One request per problem at a time: checking and revealing lock each other and the answer.
  const busy = attempt.isPending || reveal.isPending;
  const submit = () => {
    if (resolved || busy) return;
    const value = isChoice ? (choice === null ? "" : `${choice}`) : answer.trim();
    if (!value) return;
    setFeedback(null);
    attempt.mutate(value);
  };
  const preview = !isChoice && answer.trim() ? evaluate(answer.replace(/%\s*$/, "")) : null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 16 }}>
        <Animated.View style={shakeStyle}>
          <Card style={{ padding: 16, gap: 16 }}>
            <ProblemContent
              courseId={COURSE_ID}
              exerciseId={exerciseId}
              seed={item.seed}
              level={item.level}
              section="question"
              scheme={scheme}
              choice={choice}
              resolved={resolved}
              correct={resolved && state.correct}
              disabled={busy}
              onChoose={async (i) => {
                void Haptics.selectionAsync();
                setChoice(i);
              }}
              dom={domProps}
            />
            {!isChoice && (
              <View style={{ gap: 6 }}>
                <Input
                  value={answer}
                  onChangeText={setAnswer}
                  editable={!resolved && !busy}
                  placeholder={problem.inputHint ?? "Your answer"}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  autoFocus
                  maxLength={200}
                  returnKeyType={resolved ? "next" : "done"}
                  submitBehavior="submit"
                  onSubmitEditing={() => (resolved ? !finishing && onNext() : submit())}
                  accessibilityLabel="Your answer"
                  style={{ height: 54, fontSize: 20 }}
                />
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <Text variant="caption" muted style={{ flex: 1 }}>
                    {problem.inputHint ? `Format: ${problem.inputHint}` : "Fractions (3/4), decimals, sqrt(2) and pi all work"}
                  </Text>
                  {preview !== null && answer.trim() !== `${preview}` && <Text variant="caption" muted>= {Math.round(preview * 1e6) / 1e6}</Text>}
                </View>
              </View>
            )}
            {feedback && !resolved && (
              <Animated.View entering={FadeIn} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: radius.md, backgroundColor: alpha(c.danger, 0.1), paddingHorizontal: 12, paddingVertical: 9 }}>
                <Icon name="xmark" size={13} tone="danger" weight="bold" />
                <Text variant="small" tone="danger" style={{ flex: 1 }}>
                  {feedback}
                </Text>
              </Animated.View>
            )}
            {resolved && <ResolvedBanner state={state} seed={problem.prompt.length} />}
            {(hints > 0 || resolved) && (
              <ProblemContent courseId={COURSE_ID} exerciseId={exerciseId} seed={item.seed} level={item.level} section="support" scheme={scheme} hints={hints} resolved={resolved} correct={resolved && state.correct} dom={domProps} />
            )}
          </Card>
        </Animated.View>
      </ScrollView>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderColor: c.border, backgroundColor: c.background }}>
        {!resolved ? (
          <>
            {hints < problem.hints.length && <Button variant="ghost" size="sm" icon="lightbulb" title={`Hint${problem.hints.length > 1 ? ` ${hints + 1}/${problem.hints.length}` : ""}`} disabled={busy} onPress={() => setHints((h) => h + 1)} />}
            <Button variant={wrong >= 2 ? "secondary" : "ghost"} size="sm" icon="eye" title="Solution" loading={reveal.isPending} disabled={busy} onPress={() => !busy && reveal.mutate()} />
            <Button title="Check" icon="checkmark" style={{ marginLeft: "auto", paddingHorizontal: 22 }} loading={attempt.isPending} disabled={busy || (isChoice ? choice === null : !answer.trim())} onPress={submit} />
          </>
        ) : (
          <Button title={state.resolution.done ? "See results" : "Next problem"} iconRight="arrow.right" style={{ flex: 1 }} size="lg" loading={finishing} onPress={onNext} />
        )}
      </View>
    </View>
  );
}

const PRAISE = ["Nailed it!", "Perfect!", "Spot on!", "Exactly right!", "Brilliant!", "Clean solve!"];

function ResolvedBanner({ state, seed }: { state: Extract<ItemState, { phase: "resolved" }>; seed: number }) {
  const { c } = useTheme();
  const delta = state.resolution.mastery.after - state.resolution.mastery.before;
  const tone = state.correct ? c.success : c.warning;
  const answer = state.revealedAnswer ? plainTex(state.revealedAnswer.replace(/\$/g, "")) : null;
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, borderRadius: radius.xl, backgroundColor: alpha(tone, 0.12), paddingHorizontal: 14, paddingVertical: 12 }}>
      <Animated.View entering={ZoomIn.springify().stiffness(400).damping(15)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tone, alignItems: "center", justifyContent: "center" }}>
        <Icon name={state.correct ? "checkmark" : "eye.fill"} size={18} color="#fff" weight="bold" />
      </Animated.View>
      <View style={{ flex: 1, minWidth: 140 }}>
        <Text weight="semibold">{state.correct ? (state.resolution.cleanSolve ? PRAISE[seed % PRAISE.length] : "Got it!") : "Here's how it works"}</Text>
        {answer && (
          <Text variant="small">
            Answer: <Text variant="small" weight="semibold">{answer}</Text>
          </Text>
        )}
      </View>
      {/* A second-try solve is weak evidence, so mastery can dip slightly: say so kindly. */}
      {delta >= 0.005 ? (
        <View style={{ borderRadius: 999, backgroundColor: alpha(c.success, 0.15), paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text variant="caption" weight="semibold" tone="success">
            mastery +{Math.round(delta * 100)}%
          </Text>
        </View>
      ) : (
        <Text variant="caption" muted>
          {state.correct ? "Solve it first time to grow mastery" : "We'll revisit this"}
        </Text>
      )}
    </Animated.View>
  );
}
