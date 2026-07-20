import type { Patient, PatientCapacity } from "@/domain/models";

export const maria: Patient = {
  id: "patient_maria_lopez",
  displayName: "Maria Lopez",
  age: 58,
  timezone: "America/Chicago",
  conditions: ["Type 2 diabetes", "Chronic kidney disease", "Heart failure"],
};

const workDays = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  startMinute: 9 * 60,
  endMinute: 17 * 60,
}));

export const mariaCapacity: PatientCapacity = {
  patientId: maria.id,
  weeklyHealthcareCapacityMinutes: 420,
  workSchedule: workDays,
  availableHealthcareWindows: [
    ...[1, 2, 3, 4].flatMap((dayOfWeek) => [
      { dayOfWeek, startMinute: 6 * 60 + 30, endMinute: 8 * 60 },
      { dayOfWeek, startMinute: 18 * 60, endMinute: 19 * 60 },
    ]),
    { dayOfWeek: 5, startMinute: 6 * 60 + 30, endMinute: 8 * 60 },
    { dayOfWeek: 6, startMinute: 9 * 60, endMinute: 11 * 60 },
  ],
  transportationMode: "public_transit",
  transportationAvailability: [
    {
      start: "2026-07-20T05:00:00-05:00",
      end: "2026-07-26T23:00:00-05:00",
    },
  ],
  caregiverAvailability: [
    {
      caregiverId: "caregiver_elena",
      windows: [
        {
          start: "2026-07-22T18:00:00-05:00",
          end: "2026-07-22T20:00:00-05:00",
        },
        {
          start: "2026-07-25T09:00:00-05:00",
          end: "2026-07-25T12:00:00-05:00",
        },
      ],
    },
  ],
  mobilityConstraints: {
    maximumContinuousWalkingMinutes: 10,
    requiresStepFreeRoute: false,
  },
  financialConstraint: null,
  maximumHealthcareTripsPerWeek: 4,
  evidence: [
    {
      sourceDocumentId: "maria_interview",
      quote: "no more than seven hours per week to healthcare",
    },
  ],
};
