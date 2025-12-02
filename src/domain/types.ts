export type Recurrence = "DAILY" | "WEEKLY";

export interface Medication {
  PK: string;
  SK: string;
  medicationId: string;
  careRecipientId: string;
  name: string;
  dosage: string;
  notes: string;
  recurrence: Recurrence;
  timesOfDay: string[] | null;
  daysOfWeek: number[] | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMedicationRequest {
  careRecipientId: string;
  name: string;
  dosage: string;
  notes: string;
  recurrence: Recurrence;
  timesOfDay: string[] | null;
  daysOfWeek: number[] | null;
  active?: boolean;
}

export interface CreateMedicationResponse {
  medication: Medication;
}

export type DoseStatus = "UPCOMING" | "TAKEN" | "MISSED";

export interface Dose {
  PK: string;
  SK: string;
  medicationId: string;
  careRecipientId: string;
  dueAt: string;
  takenAt: string | null;
  status: DoseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DoseGenerationMessage {
  medicationId: string;
  careRecipientId: string;
  recurrence: Recurrence;
  timesOfDay: string[] | null;
  daysOfWeek: number[] | null;
  active: boolean;
}

export interface UpcomingDoseResponse {
  doseId: string;
  medicationId: string;
  careRecipientId: string;
  dueAt: string;
  status: DoseStatus;
  medication: {
    name: string;
    dosage: string;
    recurrence: Recurrence;
    notes: string;
  };
}

