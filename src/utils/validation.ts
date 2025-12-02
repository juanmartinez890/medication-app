import { Recurrence, CreateMedicationRequest } from "../domain/types";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateMedicationRequest(
  request: CreateMedicationRequest
): void {
  if (!request.careRecipientId || request.careRecipientId.trim() === "") {
    throw new ValidationError("careRecipientId is required");
  }

  if (!request.name || request.name.trim() === "") {
    throw new ValidationError("name is required");
  }

  if (!request.dosage || request.dosage.trim() === "") {
    throw new ValidationError("dosage is required");
  }

  if (!request.recurrence) {
    throw new ValidationError("recurrence is required");
  }

  if (request.recurrence === "DAILY") {
    if (!request.timesOfDay || request.timesOfDay.length === 0) {
      throw new ValidationError(
        "timesOfDay is required when recurrence is DAILY"
      );
    }
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    for (const time of request.timesOfDay) {
      if (!timeRegex.test(time)) {
        throw new ValidationError(
          `Invalid time format: ${time}. Expected format: HH:MM`
        );
      }
    }
    if (request.daysOfWeek !== null) {
      throw new ValidationError(
        "daysOfWeek must be null when recurrence is DAILY"
      );
    }
  } else if (request.recurrence === "WEEKLY") {
    if (!request.daysOfWeek || request.daysOfWeek.length === 0) {
      throw new ValidationError(
        "daysOfWeek is required when recurrence is WEEKLY"
      );
    }
    // Validate days are 0-6 (Sunday-Saturday)
    for (const day of request.daysOfWeek) {
      if (day < 0 || day > 6) {
        throw new ValidationError(
          `Invalid day of week: ${day}. Must be 0-6 (Sunday-Saturday)`
        );
      }
    }
    if (request.timesOfDay !== null) {
      throw new ValidationError(
        "timesOfDay must be null when recurrence is WEEKLY"
      );
    }
  }
}

