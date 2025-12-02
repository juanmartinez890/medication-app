import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { MedicationService } from "../services/medicationService";
import { MedicationRepository } from "../repositories/medicationRepository";
import { response } from "../utils/response";

const TABLE_NAME = process.env.MEDICATIONS_TABLE_NAME || "";

const pathSchema = z.object({
  careRecipientId: z.string().min(1, "careRecipientId is required"),
  medicationId: z.string().min(1, "medicationId is required"),
});

const buildContext = () => {
  const repository = new MedicationRepository(TABLE_NAME);
  const service = new MedicationService(repository);
  return { service };
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const careRecipientId = event.pathParameters?.careRecipientId;
    const medicationId = event.pathParameters?.medicationId;

    const parsed = pathSchema.safeParse({
      careRecipientId,
      medicationId,
    });

    if (!parsed.success) {
      return response(400, {
        error: parsed.error.errors[0]?.message || "Invalid input",
      });
    }

    const { service } = buildContext();
    const medication = await service.deactivateMedication(
      parsed.data.careRecipientId,
      parsed.data.medicationId
    );

    return response(200, {
      message: "Medication marked as inactive",
      medication,
    });
  } catch (error: any) {
    console.error("Error marking medication as inactive:", error);

    if (error.message?.includes("Medication not found")) {
      return response(404, { error: error.message });
    }

    return response(500, { error: "Internal server error" });
  }
};


