"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CareConversationBrief } from "@/ai/schemas";
import type { CareBurden, EvidenceRef, WorkloadSummary } from "@/domain/models";

type Issue = {
  id: string;
  type: string;
  explanation: string;
  obligationIds: string[];
};

export type DemoData = {
  baseline: {
    workload: WorkloadSummary;
    hardFailures: Issue[];
    warnings: Issue[];
  };
  counterfactual: {
    workload: WorkloadSummary;
    hardConflictCount: number;
    conclusion: string;
  };
  sources: Array<{ id: string; title: string; author: string; text: string }>;
  obligations: Array<{
    id: string;
    title: string;
    carePlanId: string;
    evidence: EvidenceRef[];
    burden: CareBurden;
  }>;
  brief: CareConversationBrief;
};

type Phase = "landing" | "sources" | "compiling" | "results";
type ExtractionMode = "pending" | "live_gpt" | "fallback";

const COMPILE_STEPS = [
  "Reading Cardiology Plan",
  "Reading Nephrology Plan",
  "Reading Diabetes Plan",
  "Extracting care obligations",
  "Connecting dependencies",
  "Calculating visible care work",
  "Calculating invisible care work",
  "Comparing against Maria's capacity",
];

const PLAN_DETAILS = [
  {
    id: "cardiology_plan",
    label: "Cardiology",
    eyebrow: "Plan 01",
    instructions: ["Heart failure follow-up", "Daily weight + blood pressure", "Three walking sessions"],
  },
  {
    id: "nephrology_plan",
    label: "Nephrology",
    eyebrow: "Plan 02",
    instructions: ["Kidney follow-up", "Renal panel before visit", "Daily swelling log"],
  },
  {
    id: "diabetes_plan",
    label: "Diabetes",
    eyebrow: "Plan 03",
    instructions: ["Diabetes follow-up", "Twice-daily glucose checks", "A1c draw + foot checks"],
  },
];

const SCENARIO_OPTIONS = [
  "Use approved cardiology video visit",
  "Use approved nephrology video visit",
  "Use approved diabetes video visit",
  "Combine permitted A1c + renal lab visit",
  "Use available prescription delivery",
];

const TYPE_TITLES: Record<string, string> = {
  workload_exceeds_capacity: "Weekly care load exceeds capacity",
  work_conflict: "Care collides with Maria's workday",
  mobility_mismatch: "Transit route exceeds walking capacity",
  dependency_failure: "Required lab result arrives too late",
  deadline_failure: "Renal panel misses its deadline",
  trip_limit: "Weekly trip preference exceeded",
  trip_fragmentation: "Two labs create duplicate travel",
};

const PLAN_LABELS: Record<string, string> = {
  cardiology: "Cardiology",
  nephrology: "Nephrology",
  diabetes: "Diabetes",
};

const formatHours = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${String(remainder).padStart(2, "0")}m`;
};

const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function Mark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function DemoExperience({ data }: { data: DemoData }) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("landing");
  const [compileStep, setCompileStep] = useState(0);
  const [extractionMode, setExtractionMode] = useState<ExtractionMode>("pending");
  const [stressVisible, setStressVisible] = useState(false);
  const [scenarioApplied, setScenarioApplied] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState(() => SCENARIO_OPTIONS.map(() => true));
  const [brief, setBrief] = useState(data.brief);
  const [briefVisible, setBriefVisible] = useState(false);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const stressRef = useRef<HTMLDivElement>(null);
  const scenarioRef = useRef<HTMLDivElement>(null);
  const briefRef = useRef<HTMLDivElement>(null);

  const selectedEvidence = useMemo(
    () => data.obligations.find((item) => item.id === evidenceId) ?? null,
    [data.obligations, evidenceId],
  );

  useEffect(() => {
    if (!evidenceId) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEvidenceId(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [evidenceId]);

  const compile = async () => {
    setPhase("compiling");
    setCompileStep(0);
    const animation = (async () => {
      for (let index = 0; index < COMPILE_STEPS.length; index += 1) {
        setCompileStep(index);
        await wait(reduceMotion ? 120 : 430);
      }
    })();
    const request = fetch("/api/compile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    })
      .then((response) => response.json())
      .then((payload) => {
        setExtractionMode(payload.extractionSource === "live_gpt" ? "live_gpt" : "fallback");
      })
      .catch(() => setExtractionMode("fallback"));
    await Promise.all([animation, request]);
    setPhase("results");
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }), 80);
  };

  const showStressTest = () => {
    setStressVisible(true);
    window.setTimeout(() => stressRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }), 80);
  };

  const applyCounterfactual = () => {
    setScenarioApplied(true);
    window.setTimeout(() => scenarioRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }), 80);
  };

  const generateBrief = async () => {
    setBriefVisible(true);
    fetch("/api/conversation-brief", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        baseline: data.baseline,
        counterfactual: data.counterfactual,
        evidence: data.obligations.map((item) => item.evidence),
        allowedScenarios: SCENARIO_OPTIONS,
      }),
    })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.brief) setBrief(payload.brief);
      })
      .catch(() => undefined);
    window.setTimeout(() => briefRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }), 80);
  };

  const reset = () => {
    setPhase("landing");
    setStressVisible(false);
    setScenarioApplied(false);
    setBriefVisible(false);
    setExtractionMode("pending");
    setSelectedOptions(SCENARIO_OPTIONS.map(() => true));
    setBrief(data.brief);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <main className="demo-shell">
      <header className="topbar">
        <button className="wordmark" onClick={reset} aria-label="Reset Care Compiler demo">
          <Mark />
          <span>Care Compiler</span>
        </button>
        <div className="topbar-actions">
          {phase !== "landing" && (
            <button className="text-button" onClick={reset}>Reset demo</button>
          )}
          <span className="build-label">OpenAI Build Week · Synthetic patient</span>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {phase === "landing" && (
          <motion.section
            key="landing"
            className="landing section-pad"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="hero-copy">
              <p className="kicker"><span className="pulse-dot" /> Care-plan feasibility compiler</p>
              <h1>Your doctors prescribe your care separately.<br /><em>You have to live it all at once.</em></h1>
              <p className="hero-support">
                Care Compiler combines fragmented care plans, calculates the hidden workload they create,
                and stress-tests whether the plan can actually fit your life.
              </p>
              <button className="primary-button" onClick={() => setPhase("sources")}>
                Compile Maria&apos;s Care <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="maria-intro" aria-label="Maria Lopez patient summary">
              <div className="maria-orbit" aria-hidden="true">
                <span className="orbit-card orbit-one">Cardiology</span>
                <span className="orbit-card orbit-two">Nephrology</span>
                <span className="orbit-card orbit-three">Diabetes</span>
                <div className="avatar">ML</div>
              </div>
              <div className="maria-meta">
                <div><span>Maria Lopez</span><small>58 years old</small></div>
                <strong>3 care plans</strong>
              </div>
            </div>
            <p className="landing-thesis">Every plan can be reasonable on its own—and impossible together.</p>
          </motion.section>
        )}

        {phase === "sources" && (
          <motion.section
            key="sources"
            className="sources-view section-pad"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="section-heading centered">
              <p className="kicker">Maria&apos;s care, one specialist at a time</p>
              <h2>Each plan looks reasonable on its own.</h2>
              <p>Three teams. Three thoughtful plans. No shared view of the work they create together.</p>
            </div>
            <div className="plan-grid">
              {PLAN_DETAILS.map((plan, index) => {
                const source = data.sources.find((item) => item.id === plan.id)!;
                return (
                  <motion.article
                    className={`plan-card plan-card-${index + 1}`}
                    key={plan.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.12 }}
                  >
                    <div className="document-top"><span>{plan.eyebrow}</span><span>Care plan</span></div>
                    <p className="specialty">{plan.label}</p>
                    <h3>{source.title}</h3>
                    <ul>{plan.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ul>
                    <button className="source-link" onClick={() => setEvidenceId(data.obligations.find((item) => item.carePlanId === plan.label.toLowerCase())?.id ?? null)}>
                      View source <span aria-hidden="true">↗</span>
                    </button>
                  </motion.article>
                );
              })}
            </div>
            <div className="compile-cta">
              <div><strong>But Maria only has one life.</strong><span>Compile the plans into one executable week.</span></div>
              <button className="primary-button" onClick={compile}>Compile all 3 plans <span aria-hidden="true">→</span></button>
            </div>
          </motion.section>
        )}

        {phase === "compiling" && (
          <motion.section key="compiling" className="compiling-view section-pad" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="compiler-visual" aria-hidden="true">
              <div className="source-stack"><span>CAR</span><span>NEP</span><span>DIA</span></div>
              <div className="compiler-line"><i /></div>
              <div className="compiler-core"><Mark /></div>
              <div className="compiler-line output"><i /></div>
              <div className="compiled-stack"><span /><span /><span /><span /></div>
            </div>
            <p className="kicker">Care Compiler is building Maria&apos;s whole-life view</p>
            <h2>{COMPILE_STEPS[compileStep]}<span className="ellipsis">…</span></h2>
            <div className="compile-progress" aria-label={`Compilation step ${compileStep + 1} of ${COMPILE_STEPS.length}`}>
              <motion.span animate={{ width: `${((compileStep + 1) / COMPILE_STEPS.length) * 100}%` }} />
            </div>
            <div className="compile-steps">
              {COMPILE_STEPS.map((step, index) => (
                <span key={step} className={index <= compileStep ? "complete" : ""}>{index < compileStep ? "✓" : index + 1} {step}</span>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {phase === "results" && (
        <div ref={resultRef} className="results-flow">
          <section className="compiled-summary section-pad">
            <div className="compile-complete">
              <span className="success-mark">✓</span>
              <div>
                <p className="kicker">Compilation complete</p>
                <h2>13 care obligations + 10 access-work components</h2>
                <p>23 workload elements compiled into one weekly care load.</p>
              </div>
              <span className="mode-indicator" title="Internal extraction source">
                {extractionMode === "live_gpt" ? "Live GPT-5.6 structured extraction" : "Evidence-backed structured extraction"}
              </span>
            </div>
          </section>

          <section className="care-load section-pad">
            <div className="section-heading centered light-heading">
              <p className="kicker">The workload hiding inside the plans</p>
              <h2>Maria&apos;s weekly care load</h2>
            </div>
            <div className="load-equation">
              <motion.div className="load-term visible-term" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <span>Visible care work</span><strong>11h 31m</strong>
                <small>Appointments · monitoring · labs · exercise · medications</small>
              </motion.div>
              <span className="operator">+</span>
              <motion.div className="load-term invisible-term" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} viewport={{ once: true }}>
                <span>Invisible care work</span><strong>9h 30m</strong>
                <small>Travel · waiting · pharmacy · coordination</small>
              </motion.div>
              <span className="operator">=</span>
              <motion.div className="load-total" initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} viewport={{ once: true }}>
                <span>Total care load</span><strong>21h 01m</strong><small>every week</small>
              </motion.div>
            </div>
            <div className="capacity-compare">
              <div className="compare-row required"><span>Care required</span><div><i /></div><strong>21h 01m</strong></div>
              <div className="compare-row capacity"><span>Maria&apos;s capacity</span><div><i /></div><strong>7h</strong></div>
            </div>
            <motion.div className="overload-banner" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <div><span className="pulse-ring" /><p>Care overload detected</p></div>
              <strong>≈ 3×</strong>
              <p>Maria&apos;s sustainable weekly healthcare capacity</p>
            </motion.div>
          </section>

          <section className="invisible-work section-pad">
            <div className="two-column-heading">
              <div><p className="kicker">The hidden half</p><h2>Care is more than treatment.</h2></div>
              <p>Nearly half of Maria&apos;s healthcare workload isn&apos;t treatment. It&apos;s the work required to access and coordinate it.</p>
            </div>
            <div className="burden-breakdown">
              <div className="burden-donut" aria-label="570 minutes of invisible care work">
                <div><strong>9h 30m</strong><span>invisible work</span></div>
              </div>
              <div className="burden-list">
                <div><span className="legend-dot travel" /><p><strong>Travel</strong><small>Six public-transit trips</small></p><b>470 min</b></div>
                <div><span className="legend-dot waiting" /><p><strong>Waiting</strong><small>Specialists, labs, pharmacy</small></p><b>90 min</b></div>
                <div><span className="legend-dot admin" /><p><strong>Administrative</strong><small>Prescription coordination</small></p><b>10 min</b></div>
              </div>
            </div>
            <details className="calculation-details">
              <summary>How was this calculated?</summary>
              <div>
                <p><span className="provenance documented">Documented</span> Active times explicitly stated in Maria&apos;s source plans.</p>
                <p><span className="provenance reported">Patient-reported</span> Maria&apos;s capacity and walking limit.</p>
                <p><span className="provenance default">Deterministic default</span> Versioned route, waiting, and coordination fixtures—not generated by GPT.</p>
              </div>
            </details>
            {!stressVisible && <button className="primary-button stress-button" onClick={showStressTest}>Stress Test My Care <span aria-hidden="true">→</span></button>}
          </section>

          <AnimatePresence>
            {stressVisible && (
              <motion.div ref={stressRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <section className="stress-test section-pad">
                  <div className="section-heading centered">
                    <p className="kicker">Weekly execution simulation</p>
                    <h2>Stress testing Maria&apos;s real week</h2>
                    <p>Work, transit, mobility, dependencies, and capacity—evaluated together.</p>
                  </div>
                  <div className="week-track">
                    <div className="week-line" aria-hidden="true"><motion.i initial={{ width: 0 }} whileInView={{ width: "100%" }} transition={{ duration: 1.5 }} viewport={{ once: true }} /></div>
                    {[
                      ["Mon", "10:00 AM", "Heart failure follow-up", "Work conflict", "155 min total burden"],
                      ["Tue", "7:30 AM", "A1c blood draw", "Separate lab trip", "110 min total burden"],
                      ["Wed", "1:30 PM", "Nephrology follow-up", "3 barriers", "Work · mobility · missing lab"],
                      ["Thu", "7:30 AM", "Renal panel", "Too late", "Required before Wednesday"],
                      ["Fri", "3:00 PM", "Diabetes follow-up", "Work conflict", "145 min total burden"],
                    ].map(([day, time, title, flag, note], index) => (
                      <motion.article className={`day-event ${index === 0 || index === 2 || index === 4 ? "failed" : ""}`} key={day} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.12 }} viewport={{ once: true }}>
                        <span className="day-label">{day}</span><span className="event-node" />
                        <small>{time}</small><strong>{title}</strong><em>{flag}</em><p>{note}</p>
                      </motion.article>
                    ))}
                  </div>
                  <div className="monday-focus">
                    <div><span>First visible break</span><strong>Monday · 10:00 AM</strong><p>Maria&apos;s cardiology visit begins during her 9–5 workday.</p></div>
                    <div className="burden-chips"><span><b>45</b> min visit</span><span><b>90</b> min travel</span><span><b>20</b> min waiting</span><strong>155 min</strong></div>
                  </div>
                </section>

                <section className="breakpoint section-pad">
                  <p className="kicker">What breaks first?</p>
                  <h2>Even with a perfect calendar,<br /><em>Maria&apos;s plan still doesn&apos;t fit.</em></h2>
                  <div className="breakpoint-numbers">
                    <div><strong>21h 01m</strong><span>required</span></div><span>−</span>
                    <div><strong>7h</strong><span>available</span></div><span>=</span>
                    <div className="over"><strong>14h 01m</strong><span>overload</span></div>
                  </div>
                  <p className="breakpoint-message">The problem isn&apos;t just one scheduling conflict. The total plan requires approximately three times the capacity Maria says she can sustainably give.</p>
                </section>

                <section className="issues-and-graph section-pad">
                  <div className="issues-panel">
                    <div className="panel-heading"><div><p className="kicker">Care-plan linter</p><h2>Plan issues</h2></div><div className="issue-count"><strong>7</strong><span>hard conflicts</span><strong>2</strong><span>warnings</span></div></div>
                    <div className="issue-list">
                      {[...data.baseline.hardFailures, ...data.baseline.warnings].map((issue) => {
                        const obligation = data.obligations.find((item) => issue.obligationIds.includes(item.id));
                        return (
                          <article key={issue.id}>
                            <span className={issue.id.startsWith("warning") ? "issue-icon warning" : "issue-icon"}>!</span>
                            <div><strong>{TYPE_TITLES[issue.type] ?? issue.type}</strong><p>{issue.explanation}</p><small>{obligation ? PLAN_LABELS[obligation.carePlanId] : "Combined care plans"}</small></div>
                            {obligation && <button onClick={() => setEvidenceId(obligation.id)}>View evidence</button>}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                  <div className="care-graph">
                    <p className="kicker">Care dependency graph</p><h2>One action changes the next.</h2>
                    <div className="graph-flow"><span>A1c draw</span><span className="graph-plus">+</span><span>Renal panel</span><i>→</i><strong>Nephrology follow-up</strong></div>
                    <div className="graph-flow"><span>Specialist visit</span><i>→</i><strong>Travel + waiting</strong></div>
                    <div className="graph-flow"><span>Prescription pickup</span><i>→</i><strong>Medication access</strong></div>
                    <p className="graph-note">Care Compiler preserves clinical dependencies. It only tests permitted logistical alternatives.</p>
                  </div>
                </section>

                <section className="counterfactual section-pad">
                  <div className="two-column-heading">
                    <div><p className="kicker">Safe counterfactual</p><h2>Could the logistics be redesigned?</h2></div>
                    <p>Care Compiler never changes treatment. It can test logistical options already permitted by Maria&apos;s care plans.</p>
                  </div>
                  <p className="scenario-framing">Potential logistical changes to discuss with Maria&apos;s care team.</p>
                  <div className="scenario-options">
                    {SCENARIO_OPTIONS.map((option, index) => (
                      <button
                        key={option}
                        className={selectedOptions[index] ? "selected" : ""}
                        onClick={() => setSelectedOptions((current) => current.map((value, optionIndex) => optionIndex === index ? !value : value))}
                        aria-pressed={selectedOptions[index]}
                      ><span className="toggle"><i /></span><span>{option}</span><small>Source-permitted</small></button>
                    ))}
                  </div>
                  {!scenarioApplied && <button className="primary-button scenario-button" disabled={!selectedOptions.every(Boolean)} onClick={applyCounterfactual}>Test all 5 logistical changes <span aria-hidden="true">→</span></button>}
                </section>

                <AnimatePresence>
                  {scenarioApplied && (
                    <motion.section ref={scenarioRef} className="scenario-result section-pad" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="scenario-compare">
                        <div className="before"><span>Before</span><strong>21h 01m</strong><p>6 trips · 7 hard conflicts</p></div>
                        <motion.div className="scenario-arrow" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}><i /><span>Logistics redesigned</span></motion.div>
                        <div className="after"><span>After</span><strong>13h 01m</strong><p>1 trip · 1 hard conflict</p></div>
                      </div>
                      <div className="still-overloaded"><span>Still over capacity</span><div><strong>13h 01m</strong><small>required</small></div><b>vs</b><div><strong>7h</strong><small>available</small></div><p>Approximately 6 hours over Maria&apos;s sustainable capacity.</p></div>
                      <p className="honesty-line">Logistics helped. They did not magically solve the care burden.</p>
                      {!briefVisible && <button className="primary-button brief-button" onClick={generateBrief}>Create Care Conversation Brief <span aria-hidden="true">→</span></button>}
                    </motion.section>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {briefVisible && (
                    <motion.section ref={briefRef} className="brief-section section-pad" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="brief-document">
                        <div className="brief-header"><Mark /><div><p className="kicker">Care Conversation Brief</p><h2>Take this to your care team.</h2></div><span>Maria Lopez · Synthetic patient</span></div>
                        <p className="brief-opening">Maria&apos;s three care plans create approximately 21 hours of weekly healthcare work against 7 hours of sustainable capacity.</p>
                        <div className="question-grid">
                          {brief.questionsByCareTeam.map((group) => (
                            <div key={group.audience}><span>{group.audience.replace("_", " ")}</span>{group.questions.map((question) => <p key={question}>“{question}”</p>)}</div>
                          ))}
                        </div>
                        <div className="remaining-question">After these logistical changes, Maria still has roughly 13 hours of care work and 7 hours of capacity. Which remaining burdens should her clinical teams discuss together?</div>
                        <p className="safety-notice"><span aria-hidden="true">◆</span>{brief.safetyNotice}</p>
                      </div>
                      <div className="final-message"><p>Care Compiler doesn&apos;t decide which care Maria should skip.</p><h2>It gives Maria and her clinicians the evidence to redesign a plan she can actually live.</h2><button className="text-button light" onClick={reset}>Replay demo ↻</button></div>
                    </motion.section>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {selectedEvidence && (
          <motion.div className="evidence-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setEvidenceId(null)}>
            <motion.aside className="evidence-drawer" role="dialog" aria-modal="true" aria-labelledby="evidence-title" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} onMouseDown={(event) => event.stopPropagation()}>
              <button className="drawer-close" onClick={() => setEvidenceId(null)} aria-label="Close evidence drawer">×</button>
              <p className="kicker">Source evidence</p><h2 id="evidence-title">{selectedEvidence.title}</h2>
              <span className="source-specialty">{PLAN_LABELS[selectedEvidence.carePlanId]}</span>
              {selectedEvidence.evidence.map((evidence) => {
                const source = data.sources.find((item) => item.id === evidence.sourceDocumentId);
                return <div className="evidence-quote" key={`${evidence.sourceDocumentId}-${evidence.quote}`}><span>{source?.title ?? evidence.sourceDocumentId}</span><blockquote>“{evidence.quote}”</blockquote></div>;
              })}
              <div className="provenance-stack">
                {Object.entries(selectedEvidence.burden).filter(([, value]) => value.minutesPerOccurrence > 0).map(([name, value]) => (
                  <div key={name}><span className={`provenance ${value.basis === "documented" ? "documented" : "default"}`}>{value.basis.replace("_", " ")}</span><strong>{name}</strong><b>{value.minutesPerOccurrence} min</b></div>
                ))}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
