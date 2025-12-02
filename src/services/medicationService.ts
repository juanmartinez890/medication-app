import {
  Medication,
  CreateMedicationRequest,
  DoseGenerationMessage,
} from "../domain/types";
import { MedicationRepository } from "../repositories/medicationRepository";
import { validateMedicationRequest } from "../utils/validation";
import { getCurrentTimestamp } from "../utils/dateUtils";
import { v4 as uuidv4 } from "uuid";
import { SQSService } from "./sqsService";

export class MedicationService {
  private repository: MedicationRepository;
  private sqsService: SQSService | null;

  constructor(repository: MedicationRepository, sqsService?: SQSService) {
    this.repository = repository;
    this.sqsService = sqsService || null;
  }

  async createMedication(
    request: CreateMedicationRequest
  ): Promise<Medication> {
    // Validate request
    validateMedicationRequest(request);

    // Generate medication ID using UUID
    const medicationId = uuidv4();
    const careRecipientId = request.careRecipientId;

    // Create medication object
    const now = getCurrentTimestamp();
    const medication: Medication = {
      PK: `CARE#${careRecipientId}`,
      SK: `MED#${medicationId}`,
      medicationId,
      careRecipientId,
      name: request.name,
      dosage: request.dosage,
      notes: request.notes,
      recurrence: request.recurrence,
      timesOfDay: request.timesOfDay,
      daysOfWeek: request.daysOfWeek,
      active: request.active ?? true,
      createdAt: now,
      updatedAt: now,
    };

    // Save to repository
    const savedMedication = await this.repository.create(medication);

    // Publish message to SQS for dose generation (async, don't wait)
    if (this.sqsService && savedMedication.active) {
      const message: DoseGenerationMessage = {
        medicationId: savedMedication.medicationId,
        careRecipientId: savedMedication.careRecipientId,
        recurrence: savedMedication.recurrence,
        timesOfDay: savedMedication.timesOfDay,
        daysOfWeek: savedMedication.daysOfWeek,
        active: savedMedication.active,
      };

      // Fire and forget - don't block response if SQS fails
      this.sqsService.sendDoseGenerationMessage(message).catch((error) => {
        console.error("Failed to send dose generation message:", error);
      });
    }

    return savedMedication;
  }
}

