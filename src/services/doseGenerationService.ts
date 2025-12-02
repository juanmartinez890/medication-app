import { Dose, DoseGenerationMessage, DoseStatus } from "../domain/types";
import { DoseRepository } from "../repositories/doseRepository";
import { getCurrentTimestamp } from "../utils/dateUtils";

export class DoseGenerationService {
  private repository: DoseRepository;
  // Number of days ahead to generate doses
  private readonly DAYS_AHEAD = 7;

  constructor(repository: DoseRepository) {
    this.repository = repository;
  }

  async generateDoses(message: DoseGenerationMessage): Promise<number> {
    if (!message.active) {
      return 0; // Don't generate doses for inactive medications
    }

    const doses: Dose[] = [];

    if (message.recurrence === "DAILY" && message.timesOfDay) {
      doses.push(...this.generateDailyDoses(message));
    } else if (message.recurrence === "WEEKLY" && message.daysOfWeek) {
      doses.push(...this.generateWeeklyDoses(message));
    }

    if (doses.length > 0) {
      await this.repository.batchCreate(doses);
    }

    return doses.length;
  }

  private generateDailyDoses(message: DoseGenerationMessage): Dose[] {
    const doses: Dose[] = [];
    const now = new Date();
    const nowTimestamp = getCurrentTimestamp();

    for (let dayOffset = 0; dayOffset < this.DAYS_AHEAD; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + dayOffset);
      targetDate.setHours(0, 0, 0, 0);

      for (const timeStr of message.timesOfDay!) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const dueDate = new Date(targetDate);
        dueDate.setHours(hours, minutes, 0, 0);

        // Skip if the time is in the past (for today)
        if (dayOffset === 0 && dueDate < now) {
          continue;
        }

        const dose = this.createDose(
          message,
          dueDate.toISOString(),
          nowTimestamp
        );
        doses.push(dose);
      }
    }

    return doses;
  }

  private generateWeeklyDoses(message: DoseGenerationMessage): Dose[] {
    const doses: Dose[] = [];
    const now = new Date();
    const nowTimestamp = getCurrentTimestamp();

    for (let dayOffset = 0; dayOffset < this.DAYS_AHEAD; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + dayOffset);
      targetDate.setHours(0, 0, 0, 0);

      const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 6 = Saturday

      if (message.daysOfWeek!.includes(dayOfWeek)) {
        // For weekly medications, we'll use a default time of 08:00
        // You might want to make this configurable
        const dueDate = new Date(targetDate);
        dueDate.setHours(8, 0, 0, 0);

        // Skip if the time is in the past (for today)
        if (dayOffset === 0 && dueDate < now) {
          continue;
        }

        const dose = this.createDose(
          message,
          dueDate.toISOString(),
          nowTimestamp
        );
        doses.push(dose);
      }
    }

    return doses;
  }

  private createDose(
    message: DoseGenerationMessage,
    dueAt: string,
    createdAt: string
  ): Dose {
    return {
      PK: `CARE#${message.careRecipientId}`,
      SK: `DOSE#${message.medicationId}#${dueAt}`,
      medicationId: message.medicationId,
      careRecipientId: message.careRecipientId,
      dueAt,
      takenAt: null,
      status: "UPCOMING" as DoseStatus,
      createdAt,
      updatedAt: createdAt,
    };
  }
}

