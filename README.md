# Care Compiler

> Every one of Maria's doctors created a reasonable care plan. But Maria only has one life.

Care Compiler is a care-plan feasibility compiler and stress tester. It combines care plans written one condition at a time, calculates the total visible and invisible work they create, and compares that workload with the time, transportation, work schedule, mobility, and caregiver capacity a patient actually has.

This repository is an OpenAI Build Week prototype built around synthetic patient data. It is not a medical device and does not provide treatment advice.

## The problem

Healthcare is prescribed by specialty but executed by a person. Cardiology, nephrology, and diabetes teams may each create a reasonable plan while no one sees the combined execution burden placed on the patient.

Traditional scheduling tools ask whether appointments overlap. Care Compiler asks a broader question:

**Can the complete plan fit the patient's life?**

## Product insight

A care plan contains more than treatment. It creates visible medical work—appointments, monitoring, labs, exercise, and medication routines—and invisible access work—travel, waiting, pharmacy pickup, preparation, scheduling, and coordination.

The product's central equation is:

```text
Visible medical work
+ Invisible access work
= Total care load

Total care load
vs Patient capacity
= Care-plan feasibility
```

## How it works

1. Multiple specialist plans are supplied as source documents.
2. GPT-5.6 extracts explicit, evidence-backed care facts using Structured Outputs.
3. Zod validates the extraction.
4. A deterministic normalizer resolves stable IDs, locations, dependencies, and versioned burden defaults.
5. Deterministic software expands recurrences, builds the dependency graph, calculates total workload, and stress-tests the week.
6. The rules engine identifies primary execution failures without double-counting equivalent reasons.
7. A deterministic counterfactual engine tests only source-permitted logistical alternatives.
8. GPT-5.6 can turn the deterministic findings into a structured Care Conversation Brief.

**GPT-5.6 interprets the messy care plans. Deterministic code calculates whether the plan fits Maria's life.**

## Architecture

Care Compiler is intentionally a single Next.js and TypeScript application:

- Next.js App Router for the guided product experience and two API routes.
- TypeScript domain models for capacity, obligations, burden, provenance, dependencies, failures, and scenarios.
- Zod schemas for both GPT-5.6 operations.
- OpenAI Responses API with `gpt-5.6` and Structured Outputs.
- Deterministic recurrence, workload, capacity, conflict, breakpoint, and scenario engines.
- Vitest golden tests.
- No database, authentication, queue, or external scheduling system in the MVP.

Important directories:

```text
src/ai/           GPT schemas, prompts, extraction, normalization, and brief generation
src/domain/       Deterministic compiler and feasibility rules
src/scenarios/    Immutable, evidence-gated logistical counterfactuals
src/demo/maria/   Synthetic source documents and golden fixtures
src/components/   Guided Day 3 demo experience
src/app/api/      Compile and conversation-brief endpoints
src/test/         Day 1, Day 2, and golden tests
```

## GPT-5.6's role

GPT-5.6 may:

- Extract explicitly supported care obligations.
- Extract recurrence, dates, times, deadlines, locations, and dependencies.
- Extract documented active durations.
- Identify explicitly permitted logistical alternatives.
- Attach exact source evidence.
- Flag ambiguity rather than guessing.
- Generate practical questions from deterministic findings.

GPT-5.6 may not:

- Calculate feasibility or workload totals.
- Invent travel, waiting, preparation, or administrative minutes.
- Invent obligations or modality options.
- Rank medical priorities.
- Recommend changing treatment, medication, dosage, or monitoring.

## Codex's role

Codex was used as the implementation collaborator for the three-day Build Week vertical slice: architecture, domain modeling, deterministic compiler, tests, OpenAI integration, counterfactual safety controls, and the guided product experience. Product constraints and golden outputs were kept explicit and verified in tests throughout the build.

## Deterministic feasibility engine

The engine:

- Expands care recurrences over the demo week.
- Builds and validates an acyclic dependency graph.
- Calculates visible and invisible work separately.
- Calculates effective capacity from both reported limits and available windows.
- Detects workload overload, work conflicts, schedule collisions, travel gaps, transportation availability, caregiver availability, mobility mismatches, dependency failures, deadlines, and trip fragmentation.
- Deduplicates equivalent failures into one primary conflict with supporting reasons.
- Ranks both the first chronological break and highest-impact breakpoint.

The same input always produces the same result.

## Counterfactual scenario engine

The scenario engine clones the baseline plan and applies only catalogued, source-supported logistical transformations. Maria's approved scenario tests:

- Three explicitly permitted video visits.
- One explicitly permitted combined A1c and renal lab visit.
- Explicitly available prescription delivery.

It never changes medication identity, dosage, treatment, active medical work, monitoring recurrence, clinical deadlines, dependencies, or clinical priority.

The scenario improves Maria's plan from 21 hours 1 minute to 13 hours 1 minute, but it deliberately remains classified as overloaded. Logistics help; they do not magically solve care burden.

## Safety boundaries

Care Compiler checks workload and logistical feasibility. It does not decide which care a patient should skip and does not replace clinical judgment.

The Care Conversation Brief always includes:

> This brief identifies workload and logistical barriers. It does not change medications, treatments, monitoring requirements, or clinical priorities.

Unsafe generated recommendations are rejected and replaced with a deterministic fallback brief.

## Synthetic Maria demo

Maria Lopez is a synthetic 58-year-old US patient managing type 2 diabetes, chronic kidney disease, and heart failure. She works Monday through Friday, relies on public transit, has limited walking capacity, and reports seven sustainable hours per week for healthcare work.

Golden baseline:

| Measure | Result |
|---|---:|
| Visible medical work | 691 minutes |
| Invisible care work | 570 minutes |
| Total care load | 1,261 minutes |
| Sustainable capacity | 420 minutes |
| Overload | 841 minutes |
| Trips | 6 |
| Hard conflicts | 7 |
| Warnings | 2 |

Golden logistical counterfactual:

| Measure | Result |
|---|---:|
| Visible medical work | 691 minutes |
| Invisible care work | 90 minutes |
| Total care load | 781 minutes |
| Sustainable capacity | 420 minutes |
| Residual overload | 361 minutes |
| Trips | 1 |
| Hard conflicts | 1 |

## Live extraction and deterministic fallback

GPT-5.6 Responses API integration, Structured Outputs, and Zod validation are implemented. The demo also includes a cached expected extraction for Maria.

If the OpenAI request fails, times out, exceeds quota, or returns invalid structured output, the compile route continues with the validated expected extraction. The UI reports an unobtrusive internal extraction mode and never claims a live call succeeded when fallback was used.

The fallback changes only how source facts enter the compiler. All feasibility calculations are deterministic software in both modes.

## Running locally

Requirements:

- Node.js 20.9 or newer.
- pnpm.

Install and start:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The guided demo path is:

```text
Landing
→ Specialist care plans
→ Compile
→ Care Load
→ Stress Test
→ What Breaks First
→ Logistical Counterfactual
→ Care Conversation Brief
```

Use **Reset demo** or the Care Compiler wordmark to replay.

## Environment variables

Copy `.env.example` to `.env.local` and add:

```text
OPENAI_API_KEY=your_openai_platform_key
```

Never commit `.env.local`. It is excluded by `.gitignore`.

When the key or quota is unavailable, the complete Maria demo still works through deterministic fallback.

## Tests

Run:

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

The golden suite locks baseline workload, capacity, conflicts, breakpoint ranking, extraction validation, normalization, fallback behavior, scenario immutability, protected fields, the exact counterfactual, and brief safety.

## Limitations

- Maria is the only supported normalized demo patient in this MVP.
- Route and waiting times are deterministic fixtures, not live map or provider data.
- No medication interaction or clinical appropriateness analysis is performed.
- No insurance, cost, provider availability, EHR, scheduling, or identity integration exists.
- Telehealth removes in-person work-absence barriers in the current hypothetical; active visit time remains fully counted.
- The prototype does not establish clinical severity or decide which requirement should change.

## Future vision

Future versions could support generalized patient plans, configurable local burden defaults, patient-confirmed capacity interviews, live transit data, shared clinician review, longitudinal capacity changes, standards-based clinical data import, and evaluation against real-world execution outcomes—while retaining the same deterministic safety boundary.
