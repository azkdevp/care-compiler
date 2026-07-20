import type { SourceDocument } from "@/domain/models";

export const mariaSources: SourceDocument[] = [
  {
    id: "cardiology_plan",
    kind: "cardiology_plan",
    title: "Heart Failure Follow-up Plan",
    author: "Lakeshore Cardiology",
    recordedAt: "2026-07-16T14:00:00-05:00",
    text: `Maria should attend an in-person heart failure follow-up on Monday,
July 20 at 10:00 AM. Allow 45 minutes for the visit. A video visit
is an acceptable alternative if transportation is a barrier.

Record morning weight daily before breakfast; allow 10 minutes.
Record blood pressure once daily; allow 10 minutes.

Complete three 30-minute walking sessions each week, stopping and
contacting the care team if symptoms occur.

Pick up the new heart failure prescription this week. The pharmacy
offers delivery if requested.`,
  },
  {
    id: "nephrology_plan",
    kind: "nephrology_plan",
    title: "Chronic Kidney Disease Care Plan",
    author: "Midwest Kidney Group",
    recordedAt: "2026-07-17T13:00:00-05:00",
    text: `Maria has an in-person nephrology follow-up on Wednesday, July 22
at 1:30 PM. Allow 45 minutes. Telehealth is acceptable for this
follow-up.

A renal function blood panel must be completed before the visit.
The laboratory appointment is Thursday, July 23 at 7:30 AM. With
approval from both ordering offices, the renal panel may instead be
completed Tuesday, July 21 at 7:30 AM together with the A1c draw,
before the Wednesday nephrology visit.

Track swelling symptoms once daily; allow 5 minutes.`,
  },
  {
    id: "diabetes_plan",
    kind: "diabetes_plan",
    title: "Diabetes Self-Management Plan",
    author: "Westside Diabetes Center",
    recordedAt: "2026-07-17T15:00:00-05:00",
    text: `Attend an in-person diabetes follow-up Friday, July 24 at 3:00 PM.
Allow 45 minutes. A video visit is acceptable when travel is difficult.

Check and record blood glucose twice daily. Each check takes about
10 minutes.

Complete a foot check once daily. Allow 5 minutes.

Continue the morning and evening medication routine. The combined
hands-on time is about 8 minutes per day.

Complete the ordered A1c blood draw Tuesday, July 21 at 7:30 AM.
The laboratory may combine this draw with other blood work when
the ordering offices approve.`,
  },
  {
    id: "maria_interview",
    kind: "patient_interview",
    title: "Patient Capacity Interview",
    author: "Care Coordinator",
    recordedAt: "2026-07-18T11:00:00-05:00",
    text: `Maria works Monday through Friday from 9:00 AM to 5:00 PM.

She says she can realistically devote no more than seven hours per
week to healthcare without missing work, sleep, meals, or household
responsibilities.

Maria does not own a car and uses buses and trains. She can walk
for about 10 minutes at a time. The walking connection to Midwest
Kidney Group takes approximately 18 minutes.

Her daughter Elena can assist Wednesday after 6:00 PM and Saturday
from 9:00 AM to noon.

Maria would like to keep healthcare trips to no more than four per
week.`,
  },
];
