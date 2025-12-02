import { SQSEvent, SQSRecord } from "aws-lambda";
import { DoseGenerationService } from "../services/doseGenerationService";
import { DoseRepository } from "../repositories/doseRepository";
import { DoseGenerationMessage } from "../domain/types";

const TABLE_NAME = process.env.MEDICATIONS_TABLE_NAME || "";

export const handler = async (event: SQSEvent): Promise<void> => {
  const repository = new DoseRepository(TABLE_NAME);
  const service = new DoseGenerationService(repository);

  const promises = event.Records.map(async (record: SQSRecord) => {
    try {
      const message: DoseGenerationMessage = JSON.parse(record.body);
      const doseCount = await service.generateDoses(message);
      console.log(
        `Generated ${doseCount} doses for medication ${message.medicationId}`
      );
    } catch (error) {
      console.error("Error processing dose generation message:", error);
      // Re-throw to trigger SQS retry mechanism
      throw error;
    }
  });

  await Promise.all(promises);
};

