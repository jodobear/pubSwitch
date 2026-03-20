import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getSingleTagValue, type NostrEvent } from "@tack/protocol-shared";
import {
  buildFollowerRotationNotice,
  buildScenarioPrompt,
  buildSignupState,
  describeIdentityState,
  describeObservedEvent,
  getSuggestedPathCPackageIdForPathA,
  receiptTone,
  shortHex,
  summarizeReceipt,
} from "./operator-view";
import { useLiveOperator } from "./use-live-operator";
import {
  DEMO_SHAPES,
  getDemoShapeMeta,
  type DemoShapeId,
  filterPackagesForDemoShape,
  getDefaultPackageIdForDemoShape,
} from "./demo-shapes";
import { buildPathALivePlayback, buildPathCLivePlayback, type PathALivePlayback, type PathCLivePlayback } from "./live-demo";
import {
  describeAudienceDecision,
  getPathCAudienceExperience,
  type AudienceLocalAction,
  type PathCAudienceExperience,
  type PathCAudienceScenarioId,
} from "./path-c-audience-demo";
import { redactRecoveryBundlePayload, buildRecoveryBundlePayloadFromPathAScenario } from "./recovery-bundle";
import {
  buildOnstageEventRows,
  describeFollowerStage,
  describePreparedMigrationStage,
  describeSocialStage,
  type OnstageSummary,
} from "./onstage-view";
import { getStageStory, STAGE_STORIES, type StageStoryId } from "./stage-stories";

type ReplayModel =
  | { lane: "path-a"; playback: PathALivePlayback }
  | { lane: "path-c"; playback: PathCLivePlayback };

export function App() {
  const operator = useLiveOperator();
  const [surfaceMode, setSurfaceMode] = useState<"console" | "stage">("stage");
  const [activeStoryId, setActiveStoryId] = useState<StageStoryId>("sign-up");
  const [activeShape, setActiveShape] = useState<DemoShapeId>("onboarding");
  const [replayModel, setReplayModel] = useState<ReplayModel | undefined>(undefined);
  const [replayStepIndex, setReplayStepIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  const activeShapeMeta = getDemoShapeMeta(activeShape);
  const activeStory = getStageStory(activeStoryId);
  const visiblePackages =
    operator.state.status === "ready"
      ? filterPackagesForDemoShape(operator.state.packages, activeShape)
      : [];

  useEffect(() => {
    if (surfaceMode !== "stage" || operator.state.status !== "ready") {
      return;
    }

    if (activeShape !== activeStory.shapeId) {
      setActiveShape(activeStory.shapeId);
    }

    if (operator.currentPackage?.id !== activeStory.packageId) {
      operator.selectPackage(activeStory.packageId);
    }
  }, [surfaceMode, operator, activeShape, activeStory, operator.currentPackage?.id]);

  useEffect(() => {
    if (operator.state.status !== "ready") {
      return;
    }

    const defaultId = getDefaultPackageIdForDemoShape(operator.state.packages, activeShape);
    const visibleIds = new Set(visiblePackages.map((entry) => entry.id));

    if (defaultId && (!operator.currentPackage || !visibleIds.has(operator.currentPackage.id) || (activeShape === "onboarding" && operator.currentPackage.id !== defaultId))) {
      operator.selectPackage(defaultId);
    }
  }, [activeShape, operator, visiblePackages]);

  useEffect(() => {
    setReplayStepIndex(0);
    setAutoPlay(false);

    if (!operator.currentPackage) {
      setReplayModel(undefined);
      return;
    }

    if (activeShape === "path-a-replay" && operator.currentPackage.lane === "path-a") {
      setReplayModel({
        lane: "path-a",
        playback: buildPathALivePlayback(operator.currentPackage.scenario),
      });
      return;
    }

    if (activeShape === "path-c-replay" && operator.currentPackage.lane === "path-c") {
      let cancelled = false;
      buildPathCLivePlayback(operator.currentPackage.scenario).then((playback) => {
        if (!cancelled) {
          setReplayModel({
            lane: "path-c",
            playback,
          });
        }
      });

      return () => {
        cancelled = true;
      };
    }

    setReplayModel(undefined);
  }, [activeShape, operator.currentPackage]);

  useEffect(() => {
    if (!autoPlay || !replayModel) {
      return;
    }

    const steps = replayModel.playback.steps;
    if (replayStepIndex >= steps.length - 1) {
      setAutoPlay(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setReplayStepIndex((current) => Math.min(current + 1, steps.length - 1));
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [autoPlay, replayModel, replayStepIndex]);

  if (operator.state.status === "loading") {
    return <Shell title="Loading demo acts..." detail="Preparing onboarding, Path A, and Path C demo surfaces." />;
  }

  if (operator.state.status === "error" || !operator.currentPackage) {
    return (
      <Shell
        title="Failed to load demo packages"
        detail={operator.state.status === "error" ? operator.state.message : "No package available"}
      />
    );
  }

  const currentPackage = operator.currentPackage;
  const identityState = describeIdentityState({
    demoPackage: currentPackage,
    pathAState: operator.pathAState,
    pathCStateText: operator.pathCStateText,
  });

  if (surfaceMode === "stage") {
    return (
        <StagePage
          operator={operator}
          currentPackage={currentPackage}
          onBackToConsole={() => setSurfaceMode("console")}
          activeStoryId={activeStoryId}
          setActiveStoryId={setActiveStoryId}
        />
    );
  }

  return (
    <main className="console-page">
      <header className="console-shell console-topbar">
        <div className="brand-block">
          <p className="eyebrow">Backstage</p>
          <h1>pubSwitch</h1>
          <p className="lead">{activeShapeMeta.title}</p>
          <p className="sublead">{activeShapeMeta.detail}</p>
        </div>

        <div className="topbar-side">
          <div className="shape-tabs" role="tablist" aria-label="Demo acts">
            {DEMO_SHAPES.map((shape) => (
              <button
                key={shape.id}
                className={`tab-chip ${shape.id === activeShape ? "active" : ""}`}
                type="button"
                onClick={() => setActiveShape(shape.id)}
              >
                {shape.label}
              </button>
            ))}
          </div>

          {activeShape !== "onboarding" ? (
            <label className="field compact">
              <span>Scenario</span>
              <select
                className="input"
                value={currentPackage.id}
                onChange={(event) => operator.selectPackage(event.currentTarget.value)}
              >
                {visiblePackages.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    [{entry.lane}] {entry.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="topbar-actions">
            <button className="button ghost" type="button" onClick={() => setSurfaceMode("stage")}>
              Onstage
            </button>
            <button className="button primary" type="button" onClick={() => operator.setIsConnected((current) => !current)}>
              {operator.isConnected ? "Disconnect relays" : "Connect relays"}
            </button>
            <button className="button ghost" type="button" onClick={operator.resetSession}>
              Fresh watch
            </button>
          </div>
        </div>
      </header>

      <div className="telemetry-bar">
        <span className={`badge lane ${currentPackage.lane}`}>{currentPackage.lane === "path-a" ? "Path A" : "Path C"}</span>
        <span className="badge">{currentPackage.title}</span>
        <span className={`badge ${operator.isConnected ? "live" : "idle"}`}>{operator.isConnected ? "Live" : "Offline"}</span>
        <div className="relay-cluster">
          {operator.relayUrls.map((url) => {
            const status = operator.connectionMap[url] ?? { url, state: "idle" as const };
            return (
              <span key={url} className="relay-token" title={status.detail ?? status.state}>
                <span className={`relay-light ${status.state}`}></span>
                {url.replace(/^wss?:\/\//, "")}
              </span>
            );
          })}
        </div>
      </div>

      {activeShape === "onboarding" ? (
        <OnboardingAct operator={operator} currentPackage={currentPackage} identityState={identityState} />
      ) : null}

      {activeShape === "path-a-live" || activeShape === "path-c-live" ? (
        <LiveAct
          operator={operator}
          currentPackage={currentPackage}
          identityState={identityState}
          title={activeShape === "path-a-live" ? "Path A Live" : "Path C Live"}
        />
      ) : null}

      {activeShape === "follower-view" ? (
        <FollowerAct
          operator={operator}
          currentPackage={currentPackage}
          identityState={identityState}
          openPathCAttestation={(packageId) => {
            setActiveShape("path-c-live");
            operator.selectPackage(packageId);
          }}
        />
      ) : null}

      {activeShape === "path-a-replay" || activeShape === "path-c-replay" ? (
        <ReplayAct
          operator={operator}
          currentPackage={currentPackage}
          replayModel={replayModel}
          replayStepIndex={replayStepIndex}
          setReplayStepIndex={setReplayStepIndex}
          autoPlay={autoPlay}
          setAutoPlay={setAutoPlay}
        />
      ) : null}
    </main>
  );
}

function StagePage(props: {
  operator: ReturnType<typeof useLiveOperator>;
  currentPackage: NonNullable<ReturnType<typeof useLiveOperator>["currentPackage"]>;
  onBackToConsole: () => void;
  activeStoryId: StageStoryId;
  setActiveStoryId: React.Dispatch<React.SetStateAction<StageStoryId>>;
}) {
  const { operator, currentPackage, onBackToConsole, activeStoryId, setActiveStoryId } = props;
  const [stageAuto, setStageAuto] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [signupHandle, setSignupHandle] = useState("tack");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [pathCAudience, setPathCAudience] = useState<PathCAudienceExperience | undefined>(undefined);
  const [socialStepIndex, setSocialStepIndex] = useState(0);
  const [socialLocalAction, setSocialLocalAction] = useState<AudienceLocalAction | undefined>(undefined);
  const [followerDecision, setFollowerDecision] = useState<"accept" | "reject" | "ignore" | undefined>(undefined);
  const activeStory = getStageStory(activeStoryId);
  const preparedSummary = describePreparedMigrationStage(operator.pathAState);
  const followerNotice = buildFollowerRotationNotice({
    pathAState: operator.pathAState,
    observedProtocolKinds: operator.pathAProtocolEvents.map((event) => event.kind),
  });
  const followerSummary = describeFollowerStage(followerNotice);
  const socialSummary = describeSocialStage(operator.pathCStateText);
  const signupState =
    currentPackage.lane === "path-a"
      ? buildSignupState({
          handle: signupHandle,
          passphrase: operator.bundlePassphrase,
          confirmPassphrase,
          bundleReady: operator.bundleEnvelopeText.length > 0,
          connected: operator.isConnected,
          pmaSent: operator.publishCursor >= 1,
          proofSent: operator.publishCursor >= 2,
        })
      : undefined;
  const replayPlayback = useMemo(
    () =>
      activeStoryId === "contested" && currentPackage.lane === "path-a"
        ? buildPathALivePlayback(currentPackage.scenario)
        : undefined,
    [activeStoryId, currentPackage],
  );
  const replayStep = replayPlayback?.steps[stageIndex];
  const contestedSummary = replayStep ? describePreparedMigrationStage(replayStep.resolvedState) : undefined;
  const socialStep = pathCAudience?.steps[socialStepIndex];
  const socialStepCount = pathCAudience?.steps.length ?? 0;
  const socialDecision =
    socialStep ? describeAudienceDecision({ decision: socialLocalAction, step: socialStep }) : undefined;
  const followerPlayback =
    currentPackage.lane === "path-a" ? buildPathALivePlayback(currentPackage.scenario) : undefined;
  const preparedMigrationEvent = currentPackage.preparedActions.find((action) => action.event.kind === 1776)?.event;
  const preparedExecutionEvent = currentPackage.preparedActions.find((action) => action.event.kind === 1777)?.event;
  const preparedMigrationPubkey =
    currentPackage.lane === "path-a"
      ? preparedMigrationEvent
        ? getSingleTagValue(preparedMigrationEvent, "m") ?? "(none)"
        : "(none)"
      : "(none)";
  const preparedSuccessorPubkey =
    currentPackage.lane === "path-a"
      ? preparedExecutionEvent
        ? getSingleTagValue(preparedExecutionEvent, "n") ?? "(none)"
        : "(none)"
      : "(none)";
  const signupEventRows =
    currentPackage.lane === "path-a"
      ? buildOnstageEventRows({
          actions: currentPackage.preparedActions,
          observedEvents: operator.relevantObservedEvents,
          publishCursor: operator.publishCursor,
          kinds: [1776, 1040],
        })
      : [];
  const pathAEventRows =
    currentPackage.lane === "path-a"
      ? buildOnstageEventRows({
          actions: currentPackage.preparedActions,
          observedEvents: operator.relevantObservedEvents,
          publishCursor: operator.publishCursor,
          kinds: [1776, 1040, 1779, 1777],
        })
      : [];
  const pathCEventRows =
    currentPackage.lane === "path-c"
      ? buildOnstageEventRows({
          actions: currentPackage.preparedActions,
          observedEvents: operator.relevantObservedEvents,
          publishCursor: operator.publishCursor,
          kinds: [1778, 31778],
        })
      : [];
  const followerObservedCount = operator.pathAProtocolEvents.length + operator.pathAProofEvents.length;
  const followerProjectedStep =
    followerPlayback?.steps[Math.min(operator.publishCursor, Math.max(followerPlayback.steps.length - 1, 0))];
  const followerProjectedNotice = followerProjectedStep
    ? buildFollowerRotationNotice({
        pathAState: followerProjectedStep.resolvedState,
        observedProtocolKinds: followerProjectedStep.visibleScenario.events.map((event) => event.kind),
      })
    : undefined;
  const useProjectedFollowerNotice =
    activeStoryId === "followers" &&
    operator.publishCursor > 0 &&
    operator.publishCursor > followerObservedCount &&
    followerProjectedNotice;
  const onstageFollowerSummary = describeFollowerStage(
    useProjectedFollowerNotice ? followerProjectedNotice : followerNotice,
  );

  useEffect(() => {
    setStageIndex(0);
    setStageAuto(false);
    setSocialStepIndex(0);
    setSocialLocalAction(undefined);
    setFollowerDecision(undefined);
    setConfirmPassphrase("");
    if (activeStoryId === "sign-up") {
      setSignupHandle("tack");
    }
  }, [activeStoryId, currentPackage.id]);

  useEffect(() => {
    if (activeStoryId !== "social" || currentPackage.lane !== "path-c") {
      setPathCAudience(undefined);
      return;
    }

    let cancelled = false;
    getPathCAudienceExperience(currentPackage.id as PathCAudienceScenarioId).then((experience) => {
      if (!cancelled) {
        setPathCAudience(experience);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeStoryId, currentPackage]);

  useEffect(() => {
    const steps = replayPlayback?.steps ?? [];
    if (activeStoryId !== "contested" || !stageAuto || steps.length <= 1 || stageIndex >= steps.length - 1) {
      if (activeStoryId === "contested" && stageIndex >= steps.length - 1) {
        setStageAuto(false);
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setStageIndex((current) => Math.min(current + 1, steps.length - 1));
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [activeStoryId, replayPlayback, stageAuto, stageIndex]);

  return (
    <main className="stage-page stage-page-v2">
      <header className="stage-topbar onstage-topbar">
        <div className="stage-brand onstage-brand">
          <p className="eyebrow">Onstage</p>
          <h1>pubSwitch</h1>
          <p className="sublead">{activeStory.label}</p>
          {activeStory.label !== activeStory.protocolLabel ? (
            <p className="stage-protocol-label">{activeStory.protocolLabel}</p>
          ) : null}
        </div>
        <div className="stage-actions onstage-actions">
          <div className="shape-tabs story-nav" role="tablist" aria-label="Stories">
            {STAGE_STORIES.map((story) => (
              <button
                key={story.id}
                className={`tab-chip story-chip ${story.id === activeStoryId ? "active" : ""}`}
                type="button"
                onClick={() => setActiveStoryId(story.id)}
              >
                {story.label}
              </button>
            ))}
          </div>
          <div className="topbar-actions">
            <button className="button primary" type="button" onClick={() => operator.setIsConnected((current) => !current)}>
              {operator.isConnected ? "Disconnect relays" : "Connect relays"}
            </button>
            <button className="button ghost" type="button" onClick={operator.resetSession}>
              Fresh watch
            </button>
            <button className="button ghost" type="button" onClick={onBackToConsole}>
              Backstage
            </button>
          </div>
        </div>
      </header>

      <section className="stage-shell onstage-shell">
        <article className="onstage-hero">
          <div>
            <span className="story-step">{activeStory.protocolLabel}</span>
            <strong>{activeStory.label}</strong>
            <p>{activeStory.detail}</p>
          </div>
          <div className="onstage-status-row">
            <span className={`pill ${operator.isConnected ? "ok" : "muted"}`}>
              {operator.isConnected ? `${operator.openRelayCount}/${operator.relayUrls.length} relays live` : "offline"}
            </span>
            {operator.relayUrls.map((url) => {
              const status = operator.connectionMap[url] ?? { url, state: "idle" as const };
              return (
                <span key={url} className="relay-token onstage-relay" title={status.detail ?? status.state}>
                  <span className={`relay-light ${status.state}`}></span>
                  {url.replace(/^wss?:\/\//, "")}
                </span>
              );
            })}
          </div>
        </article>

        {activeStoryId === "sign-up" && currentPackage.lane === "path-a" && signupState ? (
          <section className="onstage-grid">
            <div className="onstage-main">
              <article className="stage-card stage-card--primary">
                <span className="mini-label">Do this</span>
                <h3>Create account package</h3>
                <p>Choose a handle, protect the backup, then publish 1776 and 1040.</p>
                <label className="field compact">
                  <span>Handle</span>
                  <input
                    className="input"
                    value={signupHandle}
                    onChange={(event) => setSignupHandle(event.currentTarget.value.replace(/\s+/g, "-"))}
                  />
                </label>
                <div className="signup-grid">
                  <input
                    className="input"
                    type="password"
                    placeholder="Passphrase"
                    value={operator.bundlePassphrase}
                    onChange={(event) => operator.setBundlePassphrase(event.currentTarget.value)}
                  />
                  <input
                    className="input"
                    type="password"
                    placeholder="Confirm"
                    value={confirmPassphrase}
                    onChange={(event) => setConfirmPassphrase(event.currentTarget.value)}
                  />
                </div>
                <div className="button-stack">
                  <button
                    className="button"
                    type="button"
                    disabled={!signupState.canCreatePackage}
                    onClick={() => {
                      void operator.createBundle()
                        .then(() => operator.setOperatorMessage(`Account package created for ${signupHandle}.`))
                        .catch((error: unknown) =>
                          operator.setOperatorMessage(error instanceof Error ? error.message : String(error)),
                        );
                    }}
                  >
                    Create account package
                  </button>
                  <button
                    className="button primary"
                    type="button"
                    disabled={!signupState.canFinishSignup || operator.publishCursor >= 2}
                    onClick={() => {
                      void (async () => {
                        if (!operator.bundleEnvelopeText) {
                          await operator.createBundle();
                        }
                        await operator.publishAllRemainingActions();
                        operator.setOperatorMessage(`Signup complete for ${signupHandle}.`);
                      })().catch((error: unknown) =>
                        operator.setOperatorMessage(error instanceof Error ? error.message : String(error)),
                      );
                    }}
                  >
                    {operator.publishCursor >= 2 ? "Published" : "Finish signup"}
                  </button>
                </div>
              </article>

              <StageSummaryCard
                heading="Client sees"
                summary={preparedSummary}
                metrics={[
                  { label: "handle", value: signupHandle },
                  { label: "proof", value: operator.proofStatusLabel },
                  {
                    label: "identity",
                    value: describeIdentityState({
                      demoPackage: currentPackage,
                      pathAState: operator.pathAState,
                      pathCStateText: operator.pathCStateText,
                    }),
                  },
                ]}
              />
            </div>

            <div className="onstage-side">
              <StageStatsCard
                title="Keys"
                items={[
                  { label: "old key", value: shortHex(currentPackage.scenario.oldPubkey) },
                  { label: "migration key", value: shortHex(preparedMigrationPubkey) },
                  { label: "next send", value: operator.nextPreparedAction?.title ?? "complete" },
                ]}
              />
              <StageEventStatusCard title="1776 + 1040" rows={signupEventRows} />
              {operator.bundleEnvelopeText ? (
                <details className="details drawer">
                  <summary>Encrypted backup</summary>
                  <pre>{operator.bundleEnvelopeText}</pre>
                </details>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeStoryId === "happy" && currentPackage.lane === "path-a" ? (
          <section className="onstage-grid">
            <div className="onstage-main">
              <article className="stage-card stage-card--primary">
                <span className="mini-label">Do this</span>
                <h3>Publish the rotation</h3>
                <p>Send a normal note, then walk the prepared migration chain to one successor.</p>
                <div className="composer-inline">
                  <input
                    className="input"
                    value={operator.noteDraft}
                    onChange={(event) => operator.setNoteDraft(event.currentTarget.value)}
                  />
                  <button
                    className="button"
                    type="button"
                    disabled={!operator.isConnected}
                    onClick={() => {
                      void operator.publishLiveNote().catch((error: unknown) =>
                        operator.setOperatorMessage(error instanceof Error ? error.message : String(error)),
                      );
                    }}
                  >
                    Send note
                  </button>
                </div>
                <div className="button-stack">
                  <button
                    className="button primary"
                    type="button"
                    disabled={!operator.isConnected || !operator.nextPreparedAction}
                    onClick={() => {
                      void operator.publishNextPreparedAction().catch((error: unknown) =>
                        operator.setOperatorMessage(error instanceof Error ? error.message : String(error)),
                      );
                    }}
                  >
                    {operator.nextPreparedAction ? operator.nextPreparedAction.title : "Rotation complete"}
                  </button>
                  <button
                    className="button ghost"
                    type="button"
                    disabled={!operator.isConnected || operator.publishCursor >= currentPackage.preparedActions.length}
                    onClick={() => {
                      void operator.publishAllRemainingActions().catch((error: unknown) =>
                        operator.setOperatorMessage(error instanceof Error ? error.message : String(error)),
                      );
                    }}
                  >
                    Publish full script ({Math.max(currentPackage.preparedActions.length - operator.publishCursor, 0)} events)
                  </button>
                </div>
              </article>

              <StageSummaryCard
                heading="Client sees"
                summary={preparedSummary}
                metrics={[
                  { label: "old key", value: shortHex(currentPackage.scenario.oldPubkey) },
                  {
                    label: "successor",
                    value: shortHex(preparedSuccessorPubkey),
                  },
                  {
                    label: "suggest",
                    value: operator.pathAState?.state === "executed" ? "Follow successor" : "Inspect",
                  },
                ]}
              />
            </div>

            <div className="onstage-side">
              <StageStatsCard
                title="Live state"
                items={[
                  { label: "notes", value: String(operator.noteEvents.length) },
                  { label: "protocol", value: String(operator.pathAProtocolEvents.length) },
                  { label: "proofs", value: String(operator.pathAProofEvents.length) },
                ]}
              />
              <StageEventStatusCard title="Event progress" rows={pathAEventRows} />
              <StageEventsCard
                title="Now on relays"
                events={operator.relevantObservedEvents}
                emptyMessage="Connect, send a note, then publish the prepared events."
              />
            </div>
          </section>
        ) : null}

        {activeStoryId === "followers" && currentPackage.lane === "path-a" ? (
          <section className="onstage-grid">
            <div className="onstage-main">
              <article className="stage-card stage-card--primary">
                <span className="mini-label">Do this</span>
                <h3>Trigger the follower banner</h3>
                <p>Publish the followed account events, then show how a good client reacts.</p>
                <div className="button-stack">
                  <button
                    className="button primary"
                    type="button"
                    disabled={!operator.isConnected || !operator.nextPreparedAction}
                    onClick={() => {
                      void operator.publishNextPreparedAction().catch((error: unknown) =>
                        operator.setOperatorMessage(error instanceof Error ? error.message : String(error)),
                      );
                    }}
                  >
                    {operator.nextPreparedAction ? operator.nextPreparedAction.title : "All follower events published"}
                  </button>
                  <button
                    className="button ghost"
                    type="button"
                    disabled={!operator.isConnected || operator.publishCursor >= currentPackage.preparedActions.length}
                    onClick={() => {
                      void operator.publishAllRemainingActions().catch((error: unknown) =>
                        operator.setOperatorMessage(error instanceof Error ? error.message : String(error)),
                      );
                    }}
                  >
                    Publish full script ({Math.max(currentPackage.preparedActions.length - operator.publishCursor, 0)} events)
                  </button>
                </div>
                <div className="button-row">
                  <button
                    className={`button ${followerDecision === "accept" ? "primary" : "ghost"}`}
                    type="button"
                    onClick={() => setFollowerDecision("accept")}
                  >
                    Follow successor
                  </button>
                  <button
                    className={`button ${followerDecision === "reject" ? "primary" : "ghost"}`}
                    type="button"
                    onClick={() => setFollowerDecision("reject")}
                  >
                    Follow both
                  </button>
                  <button
                    className={`button ${followerDecision === "ignore" ? "primary" : "ghost"}`}
                    type="button"
                    onClick={() => setFollowerDecision("ignore")}
                  >
                    Inspect
                  </button>
                </div>
              </article>

              <StageSummaryCard
                heading="Follower client"
                summary={onstageFollowerSummary}
                metrics={[
                  { label: "following", value: shortHex(currentPackage.scenario.oldPubkey) },
                  {
                    label: "suggested",
                    value:
                      followerDecision === "accept"
                        ? "Follow successor"
                        : followerDecision === "reject"
                          ? "Follow both"
                          : followerDecision === "ignore"
                            ? "Inspect evidence"
                            : (useProjectedFollowerNotice ? followerProjectedNotice : followerNotice).recommendedAction ?? "Stay quiet",
                  },
                  { label: "proof", value: operator.proofStatusLabel },
                  { label: "source", value: useProjectedFollowerNotice ? "sent to relays" : "seen on relays" },
                ]}
              />
            </div>

            <div className="onstage-side">
              <StageStatsCard
                title="Follower options"
                items={[
                  {
                    label: "primary",
                    value: (useProjectedFollowerNotice ? followerProjectedNotice : followerNotice).showAttestAction ? "Show successor" : "Keep old key",
                  },
                  {
                    label: "cta",
                    value: (useProjectedFollowerNotice ? followerProjectedNotice : followerNotice).showAttestAction ? "Ask for social confirmation" : "Inspect",
                  },
                  { label: "state", value: onstageFollowerSummary.label },
                ]}
              />
              <StageEventStatusCard title="Event progress" rows={pathAEventRows} />
              <StageEventsCard
                title="Now on relays"
                events={operator.relevantObservedEvents}
                emptyMessage="Publish the followed account events first."
              />
            </div>
          </section>
        ) : null}

        {activeStoryId === "social" && currentPackage.lane === "path-c" ? (
          <section className="onstage-grid">
            <div className="onstage-main">
              <article className="stage-card stage-card--primary">
                <span className="mini-label">Do this</span>
                <h3>Publish social signals</h3>
                <p>Make the claim visible, then let followed people weigh in.</p>
                <div className="button-stack">
                  <button
                    className="button primary"
                    type="button"
                    disabled={!operator.isConnected || !operator.nextPreparedAction}
                    onClick={() => {
                      void operator.publishNextPreparedAction().catch((error: unknown) =>
                        operator.setOperatorMessage(error instanceof Error ? error.message : String(error)),
                      );
                    }}
                  >
                    {operator.nextPreparedAction ? operator.nextPreparedAction.title : "Social script complete"}
                  </button>
                  <div className="button-row">
                    <button
                      className="button ghost"
                      type="button"
                      disabled={!pathCAudience || socialStepIndex <= 0}
                      onClick={() => setSocialStepIndex((current) => Math.max(0, current - 1))}
                    >
                      Back
                    </button>
                    <button
                      className="button ghost"
                      type="button"
                      disabled={!pathCAudience || socialStepIndex >= socialStepCount - 1}
                      onClick={() => setSocialStepIndex((current) => Math.min(socialStepCount - 1, current + 1))}
                    >
                      Next view
                    </button>
                  </div>
                </div>
                <div className="button-row">
                  <button
                    className={`button ${socialLocalAction === "accept" ? "primary" : "ghost"}`}
                    type="button"
                    onClick={() => setSocialLocalAction("accept")}
                  >
                    Support
                  </button>
                  <button
                    className={`button ${socialLocalAction === "reject" ? "primary" : "ghost"}`}
                    type="button"
                    onClick={() => setSocialLocalAction("reject")}
                  >
                    Oppose
                  </button>
                  <button
                    className={`button ${socialLocalAction === "ignore" ? "primary" : "ghost"}`}
                    type="button"
                    onClick={() => setSocialLocalAction("ignore")}
                  >
                    Ignore
                  </button>
                </div>
              </article>

              <StageSummaryCard
                heading="Viewer sees"
                summary={socialSummary}
                metrics={[
                  { label: "followers", value: socialStep ? String(socialStep.followerCount) : "21" },
                  { label: "mutuals", value: socialStep ? String(socialStep.mutualCount) : "12" },
                  { label: "trusted", value: socialStep ? String(socialStep.viewerTrustedCount) : "5" },
                ]}
              />

              {socialDecision ? (
                <article className={`stage-card stage-card--summary ${socialDecision.tone}`}>
                  <span className="mini-label">Local choice</span>
                  <h3>{socialDecision.title}</h3>
                  <p>{socialDecision.detail}</p>
                </article>
              ) : null}
            </div>

            <div className="onstage-side">
              <StageStatsCard
                title="Current social step"
                items={[
                  { label: "step", value: socialStep ? socialStep.label : "loading" },
                  { label: "claims", value: socialStep ? String(socialStep.visibleClaims.length) : "0" },
                  { label: "attests", value: socialStep ? String(socialStep.visibleAttestations.length) : "0" },
                ]}
              />
              <StageEventStatusCard title="Event progress" rows={pathCEventRows} />
              <StageEventsCard
                title="Now on relays"
                events={operator.relevantObservedEvents}
                emptyMessage="Publish 1778 and 31778 events to light this up."
              />
            </div>
          </section>
        ) : null}

        {activeStoryId === "contested" && replayPlayback && replayStep && contestedSummary ? (
          <section className="onstage-grid">
            <div className="onstage-main">
              <article className="stage-card stage-card--primary">
                <span className="mini-label">Walkthrough</span>
                <h3>{replayStep.title}</h3>
                <p>{replayStep.detail}</p>
                <div className="stage-controls">
                  <button
                    className="button ghost"
                    type="button"
                    disabled={stageIndex <= 0}
                    onClick={() => setStageIndex((current) => Math.max(0, current - 1))}
                  >
                    Back
                  </button>
                  <button
                    className="button primary"
                    type="button"
                    disabled={stageIndex >= replayPlayback.steps.length - 1}
                    onClick={() => setStageIndex((current) => Math.min(current + 1, replayPlayback.steps.length - 1))}
                  >
                    Next
                  </button>
                  <button
                    className="button ghost"
                    type="button"
                    disabled={replayPlayback.steps.length <= 1}
                    onClick={() => setStageAuto((current) => !current)}
                  >
                    {stageAuto ? "Stop" : "Auto"}
                  </button>
                </div>
              </article>

              <StageSummaryCard
                heading="Client sees"
                summary={contestedSummary}
                metrics={[
                  { label: "step", value: `${stageIndex}/${Math.max(replayPlayback.steps.length - 1, 0)}` },
                  { label: "protocol", value: String(replayStep.visibleScenario.events.length) },
                  { label: "proofs", value: String(replayStep.visibleScenario.otsProofs.length) },
                ]}
              />
            </div>

            <div className="onstage-side">
              <StageStatsCard
                title="Visible now"
                items={replayStep.clientFacts.map((fact, index) => ({
                  label: `fact ${index + 1}`,
                  value: fact,
                }))}
              />
              <StageEventsCard
                title="Visible events"
                events={[...replayStep.visibleScenario.events, ...replayStep.visibleScenario.otsProofs]}
                emptyMessage="No conflict evidence visible yet."
              />
            </div>
          </section>
        ) : null}

        {operator.operatorMessage ? <p className="message onstage-message">{operator.operatorMessage}</p> : null}
      </section>
    </main>
  );
}

function StageSummaryCard(props: {
  heading: string;
  summary: OnstageSummary;
  metrics: Array<{ label: string; value: string }>;
}) {
  const { heading, summary, metrics } = props;

  return (
    <article className={`stage-card stage-card--summary ${summary.tone}`}>
      <span className="mini-label">{heading}</span>
      <div className="summary-header">
        <span className={`pill ${summary.tone === "neutral" ? "muted" : summary.tone}`}>{summary.label}</span>
      </div>
      <h3>{summary.title}</h3>
      <p>{summary.detail}</p>
      <div className="stage-stats-grid">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <span className="mini-label">{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function StageStatsCard(props: {
  title: string;
  items: Array<{ label: string; value: string }>;
}) {
  const { title, items } = props;

  return (
    <article className="stage-card stage-card--side">
      <span className="mini-label">{title}</span>
      <div className="stage-stats-list">
        {items.map((item) => (
          <div key={item.label} className="stage-stat-row">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function StageEventStatusCard(props: {
  title: string;
  rows: Array<{ id: string; kind: number; label: string; status: "queued" | "sent" | "observed" }>;
}) {
  const { title, rows } = props;

  return (
    <article className="stage-card stage-card--side">
      <span className="mini-label">{title}</span>
      <div className="stage-stats-list">
        {rows.map((row) => (
          <div key={row.id} className="stage-status-row">
            <div className="stage-status-copy">
              <strong>{row.label}</strong>
              <span>kind {row.kind}</span>
            </div>
            <span className={`pill ${row.status === "observed" ? "ok" : row.status === "sent" ? "warn" : "muted"}`}>
              {row.status === "observed" ? "seen on relays" : row.status === "sent" ? "sent" : "queued"}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function StageEventsCard(props: {
  title: string;
  events: NostrEvent[];
  emptyMessage: string;
}) {
  const { title, events, emptyMessage } = props;

  return (
    <article className="stage-card stage-card--events">
      <span className="mini-label">{title}</span>
      {events.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <>
          <div className="stage-pills">
            {events.map((event) => (
              <span key={event.id} className="badge kind">
                kind {event.kind}
              </span>
            ))}
          </div>
          <ul className="stage-event-list">
            {events.slice(0, 6).map((event) => (
              <li key={event.id}>
                <strong>{describeObservedEvent(event)}</strong>
                <span>{shortHex(event.id)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

function FollowerAct(props: {
  operator: ReturnType<typeof useLiveOperator>;
  currentPackage: NonNullable<ReturnType<typeof useLiveOperator>["currentPackage"]>;
  identityState: string;
  openPathCAttestation: (packageId: string) => void;
}) {
  const { operator, currentPackage, identityState, openPathCAttestation } = props;
  const [viewerDecision, setViewerDecision] = useState<"accept" | "reject" | "ignore" | undefined>(undefined);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setViewerDecision(undefined);
    setStepIndex(0);
  }, [currentPackage.id]);

  if (currentPackage.lane !== "path-a") {
    return null;
  }

  const playback = useMemo(() => buildPathALivePlayback(currentPackage.scenario), [currentPackage.scenario]);
  const followerStep = playback.steps[stepIndex] ?? playback.steps[0];
  const notice = buildFollowerRotationNotice({
    pathAState: operator.pathAState,
    observedProtocolKinds: operator.pathAProtocolEvents.map((event) => event.kind),
  });
  const followerStepNotice = followerStep
    ? buildFollowerRotationNotice({
        pathAState: followerStep.resolvedState,
        observedProtocolKinds: followerStep.visibleScenario.events.map((event) => event.kind),
      })
    : notice;
  const suggestedPathCPackageId = getSuggestedPathCPackageIdForPathA(currentPackage.id);

  return (
    <section className="act-grid">
      <aside className="console-shell operator-column">
        <div className="section-heading">
          <p className="eyebrow">Viewer</p>
          <h2>Follower View</h2>
          <p className="sublead">Banner, evidence, attestation.</p>
        </div>

        <article className={`story-card notice-card ${notice.tone}`}>
          <span className="story-step">rotation notice</span>
          <strong>{notice.title}</strong>
          <p>{notice.detail}</p>
          <div className="story-stats">
            <div>
              <span className="mini-label">following</span>
              <strong>{shortHex(currentPackage.scenario.oldPubkey)}</strong>
            </div>
            <div>
              <span className="mini-label">identity</span>
              <strong>{identityState}</strong>
            </div>
            <div>
              <span className="mini-label">proof</span>
              <strong>{operator.proofStatusLabel}</strong>
            </div>
            <div>
              <span className="mini-label">observed</span>
              <strong>{operator.pathAProtocolEvents.length} protocol events</strong>
            </div>
          </div>
        </article>

        <article className="console-card">
          <div className="section-heading compact">
            <h3>Follower step view</h3>
            <span className="muted">
              step {stepIndex}/{Math.max(playback.steps.length - 1, 0)}
            </span>
          </div>
          {followerStep ? (
            <>
              <div className={`decision-card ${followerStepNotice.tone === "neutral" ? "neutral" : followerStepNotice.tone}`}>
                <strong>{followerStepNotice.title}</strong>
                <p>{followerStepNotice.detail}</p>
              </div>
              <div className="button-row">
                <button
                  className="button ghost"
                  type="button"
                  disabled={stepIndex <= 0}
                  onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                >
                  Previous
                </button>
                <button
                  className="button primary"
                  type="button"
                  disabled={stepIndex >= playback.steps.length - 1}
                  onClick={() => setStepIndex((current) => Math.min(playback.steps.length - 1, current + 1))}
                >
                  Next
                </button>
              </div>
              <ul className="compact-list">
                <li>
                  <strong>{followerStep.title}</strong>
                  <span>{followerStep.detail}</span>
                </li>
                <li>
                  <strong>Visible relay events</strong>
                  <span>
                    {followerStep.visibleScenario.events.length} protocol / {followerStep.visibleScenario.otsProofs.length} proofs
                  </span>
                </li>
                <li>
                  <strong>Next move</strong>
                  <span>{followerStepNotice.recommendedAction ?? "stay quiet"}</span>
                </li>
              </ul>
              <details className="details drawer">
                <summary>Step evidence</summary>
                <ul className="compact-list">
                  {[...followerStep.visibleScenario.events, ...followerStep.visibleScenario.otsProofs].map((event) => (
                    <li key={event.id}>
                      <strong>{describeObservedEvent(event)}</strong>
                      <span>{shortHex(event.id)}</span>
                    </li>
                  ))}
                  {followerStep.visibleScenario.events.length === 0 && followerStep.visibleScenario.otsProofs.length === 0 ? (
                    <li>
                      <strong>No visible events yet</strong>
                      <span>Stay quiet.</span>
                    </li>
                  ) : null}
                </ul>
              </details>
            </>
          ) : null}
        </article>

        <article className="console-card">
          <div className="section-heading compact">
            <h3>Publish followed key</h3>
            <span className="muted">live</span>
          </div>
          <div className="button-stack">
            <button
              className="button primary"
              type="button"
              disabled={!operator.nextPreparedAction}
              onClick={() => {
                void operator.publishNextPreparedAction().catch((error: unknown) =>
                  operator.setOperatorMessage(error instanceof Error ? error.message : String(error)),
                );
              }}
            >
              {operator.nextPreparedAction ? operator.nextPreparedAction.title : "Published"}
            </button>
            <button
              className="button ghost"
              type="button"
              disabled={operator.publishCursor >= currentPackage.preparedActions.length}
              onClick={() => {
                void operator.publishAllRemainingActions().catch((error: unknown) =>
                  operator.setOperatorMessage(error instanceof Error ? error.message : String(error)),
                );
              }}
            >
              Publish rest
            </button>
          </div>
        </article>

        <article className="console-card">
          <div className="section-heading compact">
            <h3>Follower action</h3>
            <span className="muted">local</span>
          </div>
          <div className="button-row">
            <button className={`button ${viewerDecision === "accept" ? "primary" : "ghost"}`} type="button" onClick={() => setViewerDecision("accept")}>
              accept
            </button>
            <button className={`button ${viewerDecision === "reject" ? "primary" : "ghost"}`} type="button" onClick={() => setViewerDecision("reject")}>
              reject
            </button>
            <button className={`button ${viewerDecision === "ignore" ? "primary" : "ghost"}`} type="button" onClick={() => setViewerDecision("ignore")}>
              ignore
            </button>
          </div>
          <div className="decision-card neutral">
            <strong>
              {viewerDecision === "accept"
                ? "Accepted locally"
                : viewerDecision === "reject"
                  ? "Rejected locally"
                  : viewerDecision === "ignore"
                    ? "Ignored for now"
                    : notice.recommendedAction
                      ? `Recommended: ${notice.recommendedAction}`
                      : "No local action yet"}
            </strong>
            <p>
              {viewerDecision === "accept"
                ? "Show successor. Offer attestation."
                : viewerDecision === "reject"
                  ? "Keep old key primary."
                  : viewerDecision === "ignore"
                    ? "Hide for now."
                    : "User choice, not auto-rewrite."}
            </p>
          </div>
          <div className="button-stack">
            <button
              className="button"
              type="button"
              disabled={!notice.showAttestAction}
              onClick={() => openPathCAttestation(suggestedPathCPackageId)}
            >
              {notice.showAttestAction ? "Open Path C" : "Path C opens after 1777"}
            </button>
          </div>
        </article>

        <details className="details drawer">
          <summary>Inspect evidence behind the banner</summary>
          <ul className="compact-list">
            {operator.pathAProtocolEvents.length === 0 && operator.pathAProofEvents.length === 0 ? (
              <li>
                <strong>No relay-visible Path A evidence yet</strong>
                <span>Publish the followed account events first.</span>
              </li>
            ) : (
              [...operator.pathAProtocolEvents, ...operator.pathAProofEvents].map((event) => (
                <li key={event.id}>
                  <strong>{describeObservedEvent(event)}</strong>
                  <span>{shortHex(event.id)}</span>
                </li>
              ))
            )}
          </ul>
        </details>

        {operator.operatorMessage ? <p className="message operator-callout">{operator.operatorMessage}</p> : null}
      </aside>

      <ObserverPanel
        operator={operator}
        currentPackage={currentPackage}
        identityState={identityState}
        title="Follower client"
        subtitle="What the follower sees."
      />
    </section>
  );
}

function OnboardingAct(props: {
  operator: ReturnType<typeof useLiveOperator>;
  currentPackage: NonNullable<ReturnType<typeof useLiveOperator>["currentPackage"]>;
  identityState: string;
}) {
  const { operator, currentPackage, identityState } = props;
  const [signupHandle, setSignupHandle] = useState("tack");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  if (currentPackage.lane !== "path-a") {
    return null;
  }
  const createdPackage = Boolean(currentPackage.noteActors[0]);
  const pmaSent = operator.publishCursor >= 1;
  const proofSent = operator.publishCursor >= 2;
  const signupState = buildSignupState({
    handle: signupHandle,
    passphrase: operator.bundlePassphrase,
    confirmPassphrase,
    bundleReady: operator.bundleEnvelopeText.length > 0,
    connected: operator.isConnected,
    pmaSent,
    proofSent,
  });

  return (
    <section className="act-grid">
      <aside className="console-shell operator-column">
        <div className="section-heading">
          <p className="eyebrow">Act 1</p>
          <h2>Sign up</h2>
          <p className="sublead">Handle, passphrase, backup, publish.</p>
        </div>

        <article className="story-card">
          <span className="story-step">1 · account</span>
          <strong>{signupHandle}.nostr</strong>
          <div className="state-grid">
            <div>
              <span className="mini-label">handle</span>
              <strong>{signupHandle}</strong>
            </div>
            <div>
              <span className="mini-label">old key</span>
              <strong>{shortHex(currentPackage.noteActors[0]?.pubkey)}</strong>
            </div>
            <div>
              <span className="mini-label">next proof</span>
              <strong>{operator.nextPreparedAction?.title ?? "complete"}</strong>
            </div>
          </div>
        </article>

        <article className="console-card">
          <div className="section-heading compact">
            <h3>2 · Create account package</h3>
            <span className={`pill ${signupState.stageLabel === "complete" || signupState.stageLabel === "ready to publish" ? "ok" : signupState.passphraseReady ? "warn" : "muted"}`}>
              {signupState.stageLabel}
            </span>
          </div>
          <label className="field compact">
            <span>Handle</span>
            <input
              className="input"
              value={signupHandle}
              onChange={(event) => setSignupHandle(event.currentTarget.value.replace(/\s+/g, "-"))}
            />
          </label>
          <div className="signup-grid">
            <input
              className="input"
              type="password"
              placeholder="Backup passphrase"
              value={operator.bundlePassphrase}
              onChange={(event) => operator.setBundlePassphrase(event.currentTarget.value)}
            />
            <input
              className="input"
              type="password"
              placeholder="Confirm passphrase"
              value={confirmPassphrase}
              onChange={(event) => setConfirmPassphrase(event.currentTarget.value)}
            />
          </div>
          <div className="button-stack">
            <button
              className="button"
              type="button"
              disabled={!signupState.canCreatePackage}
              onClick={() => {
                if (!signupState.canCreatePackage) {
                  operator.setOperatorMessage("Set and confirm the signup passphrase first.");
                  return;
                }
                void operator.createBundle()
                  .then(() => operator.setOperatorMessage(`Account package created for ${signupHandle}.`))
                  .catch((error: unknown) =>
                    operator.setOperatorMessage(error instanceof Error ? error.message : String(error)),
                  );
              }}
            >
              Create account package
            </button>
          </div>
          {!signupState.passphraseMatches && signupState.passphraseReady ? <p className="message">Passphrases do not match yet.</p> : null}
          {operator.bundleMessage ? <p className="message">{operator.bundleMessage}</p> : null}
          {operator.bundleEnvelopeText ? (
            <details className="details drawer">
              <summary>Encrypted backup</summary>
              <pre>{operator.bundleEnvelopeText}</pre>
              <pre>
                {JSON.stringify(
                  redactRecoveryBundlePayload(
                    buildRecoveryBundlePayloadFromPathAScenario({ scenario: currentPackage.scenario }),
                  ),
                  null,
                  2,
                )}
              </pre>
            </details>
          ) : null}
        </article>

        <article className="console-card">
          <div className="section-heading compact">
            <h3>3 · Publish onboarding events</h3>
            <span className={`pill ${proofSent ? "ok" : pmaSent ? "warn" : "muted"}`}>
              {proofSent ? "complete" : pmaSent ? "halfway" : "not started"}
            </span>
          </div>
          <div className="checklist">
            <div className={`check-item ${createdPackage ? "done" : ""}`}>Create key package</div>
            <div className={`check-item ${signupState.passphraseMatches ? "done" : ""}`}>Choose handle and confirm passphrase</div>
            <div className={`check-item ${operator.bundleEnvelopeText ? "done" : ""}`}>Export encrypted backup</div>
            <div className={`check-item ${pmaSent ? "done" : ""}`}>Publish 1776 PMA</div>
            <div className={`check-item ${proofSent ? "done" : ""}`}>Publish 1040 proof</div>
          </div>
          <div className="button-stack">
            <button
              className="button primary"
              type="button"
              disabled={!operator.nextPreparedAction}
              onClick={() => {
                void operator.publishNextPreparedAction().catch((error: unknown) =>
                  operator.setOperatorMessage(error instanceof Error ? error.message : String(error)),
                );
              }}
            >
              {operator.nextPreparedAction ? operator.nextPreparedAction.title : "Onboarding published"}
            </button>
            <button
              className="button"
              type="button"
              disabled={proofSent}
              onClick={() => {
                void (async () => {
                  if (!signupState.canCreatePackage) {
                    operator.setOperatorMessage("Choose a handle and confirm the signup passphrase first.");
                    return;
                  }
                  if (!operator.isConnected) {
                    operator.setOperatorMessage("Connect to relays before finishing signup.");
                    return;
                  }
                  if (!operator.bundleEnvelopeText) {
                    await operator.createBundle();
                  }
                  await operator.publishAllRemainingActions();
                  operator.setOperatorMessage(`Signup complete for ${signupHandle}. 1776 and 1040 published.`);
                })().catch((error: unknown) =>
                  operator.setOperatorMessage(error instanceof Error ? error.message : String(error)),
                );
              }}
            >
              {proofSent ? "Signup already published" : "Finish signup and publish 1776 + 1040"}
            </button>
          </div>
        </article>
      </aside>

      <ObserverPanel
        operator={operator}
        currentPackage={currentPackage}
        identityState={identityState}
        title="Observer"
        subtitle="What relays and clients can see after each onboarding step."
      />
    </section>
  );
}

function LiveAct(props: {
  operator: ReturnType<typeof useLiveOperator>;
  currentPackage: NonNullable<ReturnType<typeof useLiveOperator>["currentPackage"]>;
  identityState: string;
  title: string;
}) {
  const { operator, currentPackage, identityState, title } = props;

  return (
    <section className="act-grid">
      <aside className="console-shell operator-column">
        <div className="section-heading">
          <p className="eyebrow">Live</p>
          <h2>{title}</h2>
          <p className="sublead">{buildScenarioPrompt(currentPackage)}</p>
        </div>

        <article className="story-card">
          <span className="story-step">next action</span>
          <strong>{operator.nextPreparedAction?.title ?? "Prepared script complete"}</strong>
          <p>{operator.nextPreparedAction?.detail ?? "Switch scenarios or use the replay acts for edge cases."}</p>
          <div className="story-stats">
            <div>
              <span className="mini-label">queued</span>
              <strong>{currentPackage.preparedActions.length - operator.publishCursor}</strong>
            </div>
            <div>
              <span className="mini-label">notes</span>
              <strong>{operator.noteEvents.length}</strong>
            </div>
          </div>
          <div className="button-stack">
            <button
              className="button primary"
              type="button"
              disabled={!operator.nextPreparedAction}
              onClick={() => {
                void operator.publishNextPreparedAction().catch((error: unknown) =>
                  operator.setOperatorMessage(error instanceof Error ? error.message : String(error)),
                );
              }}
            >
              {operator.nextPreparedAction ? operator.nextPreparedAction.title : "Script complete"}
            </button>
            <button
              className="button ghost"
              type="button"
              disabled={operator.publishCursor >= currentPackage.preparedActions.length}
              onClick={() => {
                void operator.publishAllRemainingActions().catch((error: unknown) =>
                  operator.setOperatorMessage(error instanceof Error ? error.message : String(error)),
                );
              }}
            >
              Publish remaining script
            </button>
          </div>
        </article>

        <article className="console-card">
          <div className="section-heading compact">
            <h3>Ordinary note</h3>
            <span className="muted">optional</span>
          </div>
          <label className="field compact">
            <span>Actor</span>
            <select
              className="input"
              value={operator.selectedNoteActor?.pubkey ?? ""}
              onChange={(event) => operator.setSelectedNoteActorPubkey(event.currentTarget.value)}
            >
              {currentPackage.noteActors.map((actor) => (
                <option key={actor.pubkey} value={actor.pubkey}>
                  {actor.label} · {shortHex(actor.pubkey)}
                </option>
              ))}
            </select>
          </label>
          <div className="composer-inline">
            <input
              className="input"
              value={operator.noteDraft}
              onChange={(event) => operator.setNoteDraft(event.currentTarget.value)}
            />
            <button
              className="button"
              type="button"
              onClick={() => {
                void operator.publishLiveNote().catch((error: unknown) =>
                  operator.setOperatorMessage(error instanceof Error ? error.message : String(error)),
                );
              }}
            >
              Send note
            </button>
          </div>
        </article>

        <details className="details drawer">
          <summary>Prepared script</summary>
          <ol className="script-list">
            {currentPackage.preparedActions.map((action, index) => {
              const receipts = operator.receiptsForEvent(action.event.id ?? "");
              return (
                <li key={action.id} className={index < operator.publishCursor ? "done" : ""}>
                  <div>
                    <strong>{action.title}</strong>
                    <p>{action.detail}</p>
                  </div>
                  <span className={`pill ${receiptTone(receipts[0])}`}>{summarizeReceipt(receipts[0])}</span>
                </li>
              );
            })}
          </ol>
        </details>

        {operator.operatorMessage ? <p className="message operator-callout">{operator.operatorMessage}</p> : null}
      </aside>

      <ObserverPanel
        operator={operator}
        currentPackage={currentPackage}
        identityState={identityState}
        title="Observer"
        subtitle="Relay-observed events only. This is the client view, not local operator state."
        prepend={
          currentPackage.lane === "path-c" ? (
            <PathCAudienceExperiencePanel scenarioId={currentPackage.id as PathCAudienceScenarioId} />
          ) : undefined
        }
      />
    </section>
  );
}

function ReplayAct(props: {
  operator: ReturnType<typeof useLiveOperator>;
  currentPackage: NonNullable<ReturnType<typeof useLiveOperator>["currentPackage"]>;
  replayModel: ReplayModel | undefined;
  replayStepIndex: number;
  setReplayStepIndex: React.Dispatch<React.SetStateAction<number>>;
  autoPlay: boolean;
  setAutoPlay: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { currentPackage, replayModel, replayStepIndex, setReplayStepIndex, autoPlay, setAutoPlay } = props;
  const steps = replayModel?.playback.steps ?? [];
  const actions = replayModel?.playback.actions ?? [];
  const step = steps[replayStepIndex];

  return (
    <section className="act-grid replay-grid">
      <aside className="console-shell operator-column">
        <div className="section-heading">
          <p className="eyebrow">Replay</p>
          <h2>{currentPackage.title}</h2>
          <p className="sublead">Deterministic step-through.</p>
        </div>

        <article className="story-card">
          <span className="story-step">step {replayStepIndex}/{Math.max(steps.length - 1, 0)}</span>
          <strong>{step?.title ?? "Loading playback"}</strong>
          <p>{step?.detail ?? "Preparing deterministic scenario playback."}</p>
          <div className="button-row">
            <button
              className="button ghost"
              type="button"
              disabled={replayStepIndex <= 0}
              onClick={() => setReplayStepIndex((current) => Math.max(0, current - 1))}
            >
              Previous
            </button>
            <button
              className="button primary"
              type="button"
              disabled={steps.length === 0 || replayStepIndex >= steps.length - 1}
              onClick={() => setReplayStepIndex((current) => Math.min(current + 1, steps.length - 1))}
            >
              Next
            </button>
            <button
              className="button ghost"
              type="button"
              disabled={steps.length <= 1}
              onClick={() => setAutoPlay((current) => !current)}
            >
              {autoPlay ? "Stop auto" : "Auto play"}
            </button>
          </div>
        </article>

        <article className="console-card">
          <div className="section-heading compact">
            <h3>Replay actions</h3>
            <span className="muted">{actions.length} staged events</span>
          </div>
          <ol className="script-list">
            {actions.map((action, index) => (
              <li key={action.id} className={index < replayStepIndex ? "done" : ""}>
                <div>
                  <strong>{action.title}</strong>
                  <p>{action.subtitle}</p>
                </div>
                <span className={`pill ${action.accent}`}>{index < replayStepIndex ? "visible" : "queued"}</span>
              </li>
            ))}
          </ol>
        </article>
      </aside>

      <section className="observer-column">
        <article className="console-shell state-panel">
          <div className="section-heading compact">
            <h2>Replay state</h2>
            <span className="muted">{step?.tone ?? "neutral"}</span>
          </div>
          {step ? (
            <>
              <div className="state-grid">
                {step.clientFacts.map((fact) => (
                  <div key={fact}>
                    <span className="mini-label">fact</span>
                    <strong>{fact}</strong>
                  </div>
                ))}
              </div>
              <details className="details nested">
                <summary>Resolved state</summary>
                <pre>{JSON.stringify(step.resolvedState, null, 2)}</pre>
              </details>
            </>
          ) : (
            <div className="empty-feed">
              <strong>Loading step data.</strong>
            </div>
          )}
        </article>

        <article className="console-shell feed-panel">
          <div className="section-heading compact">
            <h2>Visible events at this step</h2>
            <span className="muted">staged</span>
          </div>
          {step ? (
            <ul className="event-stream">
              {"events" in step.visibleScenario
                ? [...step.visibleScenario.events, ...step.visibleScenario.otsProofs].map((event) => (
                    <li key={event.id} className="event-row">
                      <div className="event-kindline">
                        <span className={`badge kind kind-${event.kind}`}>kind {event.kind}</span>
                        <span className="event-time">{new Date(event.created_at * 1000).toLocaleTimeString()}</span>
                      </div>
                      <strong>{describeObservedEvent(event)}</strong>
                      <div className="event-meta">
                        <code>{shortHex(event.pubkey)}</code>
                        <code>{shortHex(event.id)}</code>
                      </div>
                    </li>
                  ))
                : [...step.visibleScenario.claims, ...step.visibleScenario.attestations].map((event) => (
                    <li key={event.id} className="event-row">
                      <div className="event-kindline">
                        <span className={`badge kind kind-${event.kind}`}>kind {event.kind}</span>
                        <span className="event-time">{new Date(event.created_at * 1000).toLocaleTimeString()}</span>
                      </div>
                      <strong>{describeObservedEvent(event)}</strong>
                      <div className="event-meta">
                        <code>{shortHex(event.pubkey)}</code>
                        <code>{shortHex(event.id)}</code>
                      </div>
                    </li>
                  ))}
            </ul>
          ) : null}
        </article>
      </section>
    </section>
  );
}

function ObserverPanel(props: {
  operator: ReturnType<typeof useLiveOperator>;
  currentPackage: NonNullable<ReturnType<typeof useLiveOperator>["currentPackage"]>;
  identityState: string;
  title: string;
  subtitle: string;
  prepend?: ReactNode;
}) {
  const { operator, currentPackage, identityState, title, subtitle, prepend } = props;

  return (
    <section className="observer-column">
      {prepend}
      <div className="metric-row">
        <article className="console-shell metric-card">
          <span className="mini-label">identity</span>
          <strong>{identityState}</strong>
        </article>
        <article className="console-shell metric-card">
          <span className="mini-label">proof</span>
          <strong>{operator.proofStatusLabel}</strong>
        </article>
        <article className="console-shell metric-card">
          <span className="mini-label">network</span>
          <strong>
            {operator.openRelayCount}/{operator.relayUrls.length} relays live
          </strong>
        </article>
        <article className="console-shell metric-card">
          <span className="mini-label">feed</span>
          <strong>{operator.relevantObservedEvents.length} observed events</strong>
        </article>
      </div>

      <article className="console-shell state-panel">
        <div className="section-heading compact">
          <h2>{title}</h2>
          <span className="muted">{subtitle}</span>
        </div>
        <div className="state-grid">
          <div>
            <span className="mini-label">primary</span>
            <strong className="state-emphasis">{identityState}</strong>
          </div>
          <div>
            <span className="mini-label">protocol</span>
            <strong>
              {currentPackage.lane === "path-a"
                ? `${operator.pathAProtocolEvents.length} protocol / ${operator.pathAProofEvents.length} proof`
                : `${operator.pathCClaims.length} claims / ${operator.pathCAttestations.length} attests`}
            </strong>
          </div>
          <div>
            <span className="mini-label">note flow</span>
            <strong>{operator.noteEvents.length} kind 1 notes</strong>
          </div>
          <div>
            <span className="mini-label">latest</span>
            <strong>
              {operator.relevantObservedEvents[0]
                ? `kind ${operator.relevantObservedEvents[0].kind} · ${shortHex(operator.relevantObservedEvents[0].id)}`
                : "waiting"}
            </strong>
          </div>
        </div>
      </article>

      <article className="console-shell feed-panel">
        <div className="section-heading compact">
          <h2>Live Feed</h2>
          <span className="muted">relay-observed only</span>
        </div>

        {operator.relevantObservedEvents.length === 0 ? (
          <div className="empty-feed">
            <strong>Nothing observed yet.</strong>
            <p>Connect, publish a note, then send the prepared script.</p>
          </div>
        ) : (
          <ul className="event-stream">
            {operator.relevantObservedEvents.map((event) => (
              <li key={event.id} className="event-row">
                <div className="event-kindline">
                  <span className={`badge kind kind-${event.kind}`}>kind {event.kind}</span>
                  <span className="event-time">{new Date(event.created_at * 1000).toLocaleTimeString()}</span>
                </div>
                <strong>{describeObservedEvent(event)}</strong>
                <div className="event-meta">
                  <code>{shortHex(event.pubkey)}</code>
                  <code>{shortHex(event.id)}</code>
                </div>
                <details className="details nested">
                  <summary>Raw event</summary>
                  <pre>{JSON.stringify(event, null, 2)}</pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}

function PathCAudienceExperiencePanel(props: { scenarioId: PathCAudienceScenarioId }) {
  const { scenarioId } = props;
  const [experience, setExperience] = useState<PathCAudienceExperience | undefined>(undefined);
  const [stepIndex, setStepIndex] = useState(0);
  const [localAction, setLocalAction] = useState<AudienceLocalAction | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setExperience(undefined);
    setStepIndex(0);
    setLocalAction(undefined);

    getPathCAudienceExperience(scenarioId).then((nextExperience) => {
      if (!cancelled) {
        setExperience(nextExperience);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [scenarioId]);

  const step = experience?.steps[stepIndex];
  const decisionCopy = step ? describeAudienceDecision({ decision: localAction, step }) : undefined;

  return (
    <article className="console-shell audience-panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Path C Audience</p>
            <h2>Path C Audience</h2>
          </div>
        <span className="muted">{experience ? `${stepIndex + 1}/${experience.steps.length} steps` : "loading"}</span>
      </div>

      {!experience || !step ? (
        <div className="empty-feed">
          <strong>Preparing the room.</strong>
        </div>
      ) : (
        <>
          <div className="audience-hero">
            <div>
              <span className="story-step">{step.label}</span>
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
            </div>
            <div className="button-row">
              <button
                className="button ghost"
                type="button"
                disabled={stepIndex <= 0}
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              >
                Previous
              </button>
              <button
                className="button primary"
                type="button"
                disabled={stepIndex >= experience.steps.length - 1}
                onClick={() => setStepIndex((current) => Math.min(experience.steps.length - 1, current + 1))}
              >
                Next
              </button>
            </div>
          </div>

          <div className="audience-metrics">
            <div className="mini-stat">
              <span className="mini-label">followers</span>
              <strong>{step.followerCount}</strong>
            </div>
            <div className="mini-stat">
              <span className="mini-label">followed back</span>
              <strong>{step.mutualCount}</strong>
            </div>
            <div className="mini-stat">
              <span className="mini-label">you trust</span>
              <strong>{step.viewerTrustedCount}</strong>
            </div>
            <div className="mini-stat">
              <span className="mini-label">state</span>
              <strong>{step.state.state}</strong>
            </div>
          </div>

          <div className="audience-callout">
            <span className={`pill ${step.state.state === "socially_supported" ? "ok" : step.state.state === "socially_split" || step.state.state === "claimed" ? "warn" : "muted"}`}>
              {step.recommendedAction ? `recommend: ${step.recommendedAction}` : "watch"}
            </span>
            {step.warning ? <p>{step.warning}</p> : <p>No warning yet. The client should stay quiet until real social evidence lands.</p>}
          </div>

          <div className="audience-action-strip">
            <div className="section-heading compact">
              <h3>Local user action</h3>
              <span className="muted">local only</span>
            </div>
            <div className="button-row">
              {(["accept", "reject", "ignore"] as const).map((action) => (
                <button
                  key={action}
                  className={`button ${localAction === action ? "primary" : "ghost"}`}
                  type="button"
                  disabled={step.visibleClaims.length === 0}
                  onClick={() => setLocalAction(action)}
                >
                  {action}
                </button>
              ))}
            </div>
            {decisionCopy ? (
              <div className={`decision-card ${decisionCopy.tone}`}>
                <strong>{decisionCopy.title}</strong>
                <p>{decisionCopy.detail}</p>
              </div>
            ) : null}
          </div>

          <div className="audience-roster">
            {step.visibleMembers.map((member) => (
              <div key={member.pubkey} className={`audience-chip ${member.viewerFollows ? "trusted" : member.followedBack ? "mutual" : ""}`}>
                <strong>{member.name}</strong>
                <span>{member.followedBack ? "followed back" : "follows old key"}</span>
                <div className="chip-meta">
                  {member.viewerFollows ? <span className="mini-badge trusted">you follow</span> : null}
                  {member.liveStance ? <span className={`mini-badge ${member.liveStance}`}>{member.liveStance}</span> : null}
                  {member.method ? <span className="mini-badge">{member.method}</span> : null}
                </div>
              </div>
            ))}
          </div>

          <details className="details drawer">
            <summary>Inspect evidence</summary>
            <div className="evidence-stack">
              <div>
                <span className="mini-label">claims</span>
                {step.visibleClaims.length === 0 ? (
                  <p className="muted-line">No STCs visible yet.</p>
                ) : (
                  <ul className="compact-list">
                    {step.visibleClaims.map((event) => (
                      <li key={event.id}>
                        <strong>{getSingleTagValue(event, "r") === "new" ? "New key claim" : "Old key claim"}</strong>
                        <span>{shortHex(event.pubkey)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <span className="mini-label">attestations</span>
                {step.visibleAttestations.length === 0 ? (
                  <p className="muted-line">No STAs visible yet.</p>
                ) : (
                  <ul className="compact-list">
                    {step.visibleAttestations.map((event) => (
                      <li key={event.id}>
                        <strong>{getSingleTagValue(event, "s") ?? "uncertain"}</strong>
                        <span>{shortHex(event.pubkey)}</span>
                        <span>{getSingleTagValue(event, "m") ?? "no method"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </details>
        </>
      )}
    </article>
  );
}

function Shell(props: { title: string; detail?: string }) {
  return (
    <main className="console-page shell">
      <section className="console-shell shell-card">
        <p className="eyebrow">tack live client</p>
        <h1>{props.title}</h1>
        {props.detail ? <p className="lead">{props.detail}</p> : null}
      </section>
    </main>
  );
}
