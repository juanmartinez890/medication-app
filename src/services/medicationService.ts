import {
  Medication,
  CreateMedicationRequest,
  DoseGenerationMessage,
} from "../domain/types";
import { MedicationRepository } from "../repositories/medicationRepository";
import { DoseGenerationService } from "./doseGenerationService";
import { validateMedicationRequest } from "../utils/validation";
import { getCurrentTimestamp } from "../utils/dateUtils";
import { v4 as uuidv4 } from "uuid";
import { SQSService } from "./sqsService";

export class MedicationService {
  private repository: MedicationRepository;
  private doseGenerationService: DoseGenerationService | null;
  private sqsService: SQSService | null;

  constructor(
    repository: MedicationRepository,
    doseGenerationService?: DoseGenerationService,
    sqsService?: SQSService
  ) {
    this.repository = repository;
    this.doseGenerationService = doseGenerationService || null;
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

    // Generate doses synchronously if service is available
    if (this.doseGenerationService && savedMedication.active) {
      const message: DoseGenerationMessage = {
        medicationId: savedMedication.medicationId,
        careRecipientId: savedMedication.careRecipientId,
        recurrence: savedMedication.recurrence,
        timesOfDay: savedMedication.timesOfDay,
        daysOfWeek: savedMedication.daysOfWeek,
        active: savedMedication.active,
      };

      try {
        const doseCount = await this.doseGenerationService.generateDoses(
          message
        );
        console.log(
          `Generated ${doseCount} doses for medication ${savedMedication.medicationId}`
        );
      } catch (error) {
        console.error("Failed to generate doses synchronously:", error);
        // Fallback to SQS if synchronous generation fails
        if (this.sqsService) {
          this.sqsService
            .sendDoseGenerationMessage(message)
            .catch((sqsError) => {
              console.error("Failed to send dose generation message to SQS:", sqsError);
            });
        }
      }
    } else if (this.sqsService && savedMedication.active) {
      // Fallback to SQS if dose generation service is not available
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

