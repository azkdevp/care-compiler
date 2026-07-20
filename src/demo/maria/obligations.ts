import type {
  BurdenBasis,
  BurdenComponent,
  CareDependency,
  CareObligation,
  EvidenceRef,
  Recurrence,
  DurationScope,
} from "@/domain/models";

const evidence = (sourceDocumentId: string, quote: string): EvidenceRef[] => [
  { sourceDocumentId, quote },
];

const component = (
  minutesPerOccurrence: number,
  basis: BurdenBasis,
  rationale: string,
  sourceDocumentId?: string,
  quote?: string,
  durationScope: DurationScope = "per_occurrence",
): BurdenComponent => ({
  minutesPerOccurrence,
  durationScope,
  basis,
  rationale,
  evidence: sourceDocumentId && quote ? evidence(sourceDocumentId, quote) : [],
});

const none = component(0, "deterministic_default", "No burden for this component.");
const once = (time: string): Recurrence => ({
  frequency: "once",
  occurrencesInHorizon: 1,
  daysOfWeek: [],
  timesOfDay: [time],
});
const daily = (timesOfDay: string[]): Recurrence => ({
  frequency: "daily",
  occurrencesInHorizon: 7 * timesOfDay.length,
  daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
  timesOfDay,
});

export const mariaObligations: CareObligation[] = [
  {
    id: "cardiology_visit",
    carePlanId: "cardiology",
    kind: "appointment",
    title: "Heart failure follow-up",
    burden: {
      active: component(45, "documented", "Visit duration.", "cardiology_plan", "Allow 45 minutes"),
      travel: component(90, "deterministic_default", "Fixture public-transit round trip."),
      waiting: component(20, "deterministic_default", "Specialist waiting-time default."),
      preparation: none,
      administrative: none,
    },
    recurrence: once("10:00"),
    deadline: null,
    fixedStart: "2026-07-20T10:00:00-05:00",
    allowedWindows: [],
    locationId: "lakeshore_cardiology",
    attendanceMode: "in_person",
    transportRequirement: "public_transit",
    caregiverRequirement: { required: false, caregiverId: null },
    routeWalkingMinutes: 7,
    dependencyIds: [],
    evidence: evidence("cardiology_plan", "Monday, July 20 at 10:00 AM"),
  },
  {
    id: "daily_weight",
    carePlanId: "cardiology",
    kind: "home_monitoring",
    title: "Morning weight",
    burden: { active: component(10, "documented", "Daily measurement.", "cardiology_plan", "allow 10 minutes"), travel: none, waiting: none, preparation: none, administrative: none },
    recurrence: daily(["06:30"]), deadline: null, fixedStart: null, allowedWindows: [], locationId: "home", attendanceMode: "home", transportRequirement: "none", caregiverRequirement: { required: false, caregiverId: null }, routeWalkingMinutes: null, dependencyIds: [], evidence: evidence("cardiology_plan", "Record morning weight daily"),
  },
  {
    id: "daily_blood_pressure",
    carePlanId: "cardiology",
    kind: "home_monitoring",
    title: "Blood pressure log",
    burden: { active: component(10, "documented", "Daily measurement.", "cardiology_plan", "allow 10 minutes"), travel: none, waiting: none, preparation: none, administrative: none },
    recurrence: daily(["06:45"]), deadline: null, fixedStart: null, allowedWindows: [], locationId: "home", attendanceMode: "home", transportRequirement: "none", caregiverRequirement: { required: false, caregiverId: null }, routeWalkingMinutes: null, dependencyIds: [], evidence: evidence("cardiology_plan", "Record blood pressure once daily"),
  },
  {
    id: "walking_sessions",
    carePlanId: "cardiology",
    kind: "exercise",
    title: "Walking session",
    burden: { active: component(30, "documented", "Prescribed session duration.", "cardiology_plan", "three 30-minute walking sessions"), travel: none, waiting: none, preparation: none, administrative: none },
    recurrence: { frequency: "weekly", occurrencesInHorizon: 3, daysOfWeek: [1, 3, 6], timesOfDay: ["18:30"] }, deadline: null, fixedStart: null, allowedWindows: [], locationId: "home", attendanceMode: "home", transportRequirement: "none", caregiverRequirement: { required: false, caregiverId: null }, routeWalkingMinutes: null, dependencyIds: [], evidence: evidence("cardiology_plan", "three 30-minute walking sessions"),
  },
  {
    id: "nephrology_visit",
    carePlanId: "nephrology",
    kind: "appointment",
    title: "Nephrology follow-up",
    burden: { active: component(45, "documented", "Visit duration.", "nephrology_plan", "Allow 45 minutes"), travel: component(100, "deterministic_default", "Fixture public-transit round trip."), waiting: component(20, "deterministic_default", "Specialist waiting-time default."), preparation: none, administrative: none },
    recurrence: once("13:30"), deadline: null, fixedStart: "2026-07-22T13:30:00-05:00", allowedWindows: [], locationId: "midwest_kidney", attendanceMode: "in_person", transportRequirement: "public_transit", caregiverRequirement: { required: false, caregiverId: null }, routeWalkingMinutes: 18, dependencyIds: ["renal_before_nephrology"], evidence: evidence("nephrology_plan", "Wednesday, July 22 at 1:30 PM"),
  },
  {
    id: "renal_panel",
    carePlanId: "nephrology",
    kind: "lab",
    title: "Renal function blood panel",
    burden: { active: component(30, "deterministic_default", "Laboratory active-time fixture."), travel: component(70, "deterministic_default", "Fixture public-transit round trip."), waiting: component(10, "deterministic_default", "Laboratory waiting-time default."), preparation: none, administrative: none },
    recurrence: once("07:30"), deadline: "2026-07-22T13:30:00-05:00", fixedStart: "2026-07-23T07:30:00-05:00", allowedWindows: [{ start: "2026-07-21T07:30:00-05:00", end: "2026-07-21T08:00:00-05:00" }], locationId: "westside_lab", attendanceMode: "in_person", transportRequirement: "public_transit", caregiverRequirement: { required: false, caregiverId: null }, routeWalkingMinutes: 6, dependencyIds: [], evidence: evidence("nephrology_plan", "must be completed before the visit"),
  },
  {
    id: "swelling_log",
    carePlanId: "nephrology",
    kind: "home_monitoring",
    title: "Swelling symptom log",
    burden: { active: component(5, "documented", "Daily symptom tracking.", "nephrology_plan", "allow 5 minutes"), travel: none, waiting: none, preparation: none, administrative: none },
    recurrence: daily(["07:00"]), deadline: null, fixedStart: null, allowedWindows: [], locationId: "home", attendanceMode: "home", transportRequirement: "none", caregiverRequirement: { required: false, caregiverId: null }, routeWalkingMinutes: null, dependencyIds: [], evidence: evidence("nephrology_plan", "Track swelling symptoms once daily"),
  },
  {
    id: "diabetes_visit",
    carePlanId: "diabetes",
    kind: "appointment",
    title: "Diabetes follow-up",
    burden: { active: component(45, "documented", "Visit duration.", "diabetes_plan", "Allow 45 minutes"), travel: component(80, "deterministic_default", "Fixture public-transit round trip."), waiting: component(20, "deterministic_default", "Specialist waiting-time default."), preparation: none, administrative: none },
    recurrence: once("15:00"), deadline: null, fixedStart: "2026-07-24T15:00:00-05:00", allowedWindows: [], locationId: "westside_diabetes", attendanceMode: "in_person", transportRequirement: "public_transit", caregiverRequirement: { required: false, caregiverId: null }, routeWalkingMinutes: 8, dependencyIds: [], evidence: evidence("diabetes_plan", "Friday, July 24 at 3:00 PM"),
  },
  {
    id: "a1c_draw",
    carePlanId: "diabetes",
    kind: "lab",
    title: "A1c blood draw",
    burden: { active: component(30, "deterministic_default", "Laboratory active-time fixture."), travel: component(70, "deterministic_default", "Fixture public-transit round trip."), waiting: component(10, "deterministic_default", "Laboratory waiting-time default."), preparation: none, administrative: none },
    recurrence: once("07:30"), deadline: null, fixedStart: "2026-07-21T07:30:00-05:00", allowedWindows: [], locationId: "westside_lab", attendanceMode: "in_person", transportRequirement: "public_transit", caregiverRequirement: { required: false, caregiverId: null }, routeWalkingMinutes: 6, dependencyIds: [], evidence: evidence("diabetes_plan", "A1c blood draw Tuesday, July 21 at 7:30 AM"),
  },
  {
    id: "glucose_checks",
    carePlanId: "diabetes",
    kind: "home_monitoring",
    title: "Blood glucose check",
    burden: { active: component(10, "documented", "Each check duration.", "diabetes_plan", "Each check takes about 10 minutes"), travel: none, waiting: none, preparation: none, administrative: none },
    recurrence: daily(["07:15", "18:00"]), deadline: null, fixedStart: null, allowedWindows: [], locationId: "home", attendanceMode: "home", transportRequirement: "none", caregiverRequirement: { required: false, caregiverId: null }, routeWalkingMinutes: null, dependencyIds: [], evidence: evidence("diabetes_plan", "twice daily"),
  },
  {
    id: "foot_checks",
    carePlanId: "diabetes",
    kind: "self_examination",
    title: "Foot check",
    burden: { active: component(5, "documented", "Daily foot check.", "diabetes_plan", "Allow 5 minutes"), travel: none, waiting: none, preparation: none, administrative: none },
    recurrence: daily(["18:15"]), deadline: null, fixedStart: null, allowedWindows: [], locationId: "home", attendanceMode: "home", transportRequirement: "none", caregiverRequirement: { required: false, caregiverId: null }, routeWalkingMinutes: null, dependencyIds: [], evidence: evidence("diabetes_plan", "Complete a foot check once daily"),
  },
  {
    id: "medication_routine",
    carePlanId: "diabetes",
    kind: "medication_management",
    title: "Medication routine",
    burden: { active: component(8, "documented", "Combined daily hands-on time.", "diabetes_plan", "combined hands-on time is about 8 minutes per day", "combined_per_day"), travel: none, waiting: none, preparation: none, administrative: none },
    recurrence: daily(["07:05"]), deadline: null, fixedStart: null, allowedWindows: [], locationId: "home", attendanceMode: "home", transportRequirement: "none", caregiverRequirement: { required: false, caregiverId: null }, routeWalkingMinutes: null, dependencyIds: [], evidence: evidence("diabetes_plan", "morning and evening medication routine"),
  },
  {
    id: "prescription_pickup",
    carePlanId: "cardiology",
    kind: "prescription_pickup",
    title: "Heart failure prescription pickup",
    burden: { active: none, travel: component(60, "deterministic_default", "Fixture public-transit round trip."), waiting: component(10, "deterministic_default", "Pharmacy waiting-time default."), preparation: none, administrative: component(10, "deterministic_default", "Prescription coordination default.") },
    recurrence: once("10:00"), deadline: "2026-07-26T23:59:00-05:00", fixedStart: "2026-07-25T10:00:00-05:00", allowedWindows: [], locationId: "community_pharmacy", attendanceMode: "in_person", transportRequirement: "public_transit", caregiverRequirement: { required: false, caregiverId: null }, routeWalkingMinutes: 5, dependencyIds: [], evidence: evidence("cardiology_plan", "Pick up the new heart failure prescription this week"),
  },
];

export const mariaDependencies: CareDependency[] = [
  {
    id: "renal_before_nephrology",
    predecessorObligationId: "renal_panel",
    successorObligationId: "nephrology_visit",
    type: "result_required_before",
    minimumGapMinutes: 0,
    evidence: evidence("nephrology_plan", "renal function blood panel must be completed before the visit"),
  },
];
