import { Dose, UpcomingDoseResponse, Medication } from "../domain/types";
import { DoseRepository } from "../repositories/doseRepository";
import { MedicationRepository } from "../repositories/medicationRepository";
import { getCurrentTimestamp } from "../utils/dateUtils";

export class DoseService {
  private repository: DoseRepository;
  private medicationRepository: MedicationRepository;

  constructor(
    repository: DoseRepository,
    medicationRepository: MedicationRepository
  ) {
    this.repository = repository;
    this.medicationRepository = medicationRepository;
  }

  async getUpcomingDoses(
    careRecipientId: string
  ): Promise<UpcomingDoseResponse[]> {
    const currentTime = getCurrentTimestamp();
    const doses = await this.repository.findUpcomingDoses(
      careRecipientId,
      currentTime
    );

    if (doses.length === 0) {
      return [];
    }

    // Build unique medication keys (in case same medication has multiple doses)
    const medicationKeysMap = new Map<string, { PK: string; SK: string }>();
    doses.forEach((dose: Dose) => {
      const key = `${dose.medicationId}`;
      if (!medicationKeysMap.has(key)) {
        medicationKeysMap.set(key, {
          PK: `CARE#${dose.careRecipientId}`,
          SK: `MED#${dose.medicationId}`,
        });
      }
    });

    // Batch fetch all medications at once
    const medicationKeys = Array.from(medicationKeysMap.values());
    const medications = await this.medicationRepository.getByIds(
      medicationKeys
    );

    // Create a map for quick lookup
    const medicationMap = new Map<string, Medication>();
    medications.forEach((med) => {
      medicationMap.set(med.medicationId, med);
    });

    // Map doses to response format with medication details
    return doses
      .map((dose: Dose) => {
        const medication = medicationMap.get(dose.medicationId);
        if (!medication) {
          return null;
        }

        return {
          doseId: dose.SK,
          medicationId: dose.medicationId,
          careRecipientId: dose.careRecipientId,
          dueAt: dose.dueAt,
          status: dose.status,
          medication: {
            name: medication.name,
            dosage: medication.dosage,
            recurrence: medication.recurrence,
            notes: medication.notes,
          },
        };
      })
      .filter((dose): dose is UpcomingDoseResponse => dose !== null);
  }

  async markDoseAsTaken(
    careRecipientId: string,
    medicationId: string,
    dueAt: string
  ): Promise<Dose> {
    const dose = await this.repository.markAsTaken(
      careRecipientId,
      medicationId,
      dueAt
    );

    if (!dose) {
      throw new Error(
        "Dose not found or already taken. Ensure the dose exists and status is UPCOMING."
      );
    }

    return dose;
  }
}

