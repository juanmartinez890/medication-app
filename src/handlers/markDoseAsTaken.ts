import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { DoseService } from "../services/doseService";
import { DoseRepository } from "../repositories/doseRepository";
import { MedicationRepository } from "../repositories/medicationRepository";
import { response } from "../utils/response";

const TABLE_NAME = process.env.MEDICATIONS_TABLE_NAME || "";

const markDoseSchema = z.object({
  careRecipientId: z.string().min(1, "careRecipientId is required"),
  medicationId: z.string().min(1, "medicationId is required"),
  dueAt: z.string().datetime("dueAt must be a valid ISO 8601 datetime"),
});

const buildContext = () => {
  const doseRepository = new DoseRepository(TABLE_NAME);
  const medicationRepository = new MedicationRepository(TABLE_NAME);
  const service = new DoseService(doseRepository, medicationRepository);
  return { service };
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const careRecipientId = event.pathParameters?.careRecipientId;
    const body = event.body ? JSON.parse(event.body) : {};

    const parsed = markDoseSchema.safeParse({
      careRecipientId: careRecipientId || body.careRecipientId,
      medicationId: body.medicationId,
      dueAt: body.dueAt,
    });

    if (!parsed.success) {
      return response(400, {
        error: parsed.error.errors[0]?.message || "Invalid input",
      });
    }

    const { service } = buildContext();
    const dose = await service.markDoseAsTaken(
      parsed.data.careRecipientId,
      parsed.data.medicationId,
      parsed.data.dueAt
    );

    return response(200, {
      message: "Dose marked as taken",
      dose: {
        medicationId: dose.medicationId,
        careRecipientId: dose.careRecipientId,
        dueAt: dose.dueAt,
        takenAt: dose.takenAt,
        status: dose.status,
      },
    });
  } catch (error: any) {
    console.error("Error marking dose as taken:", error);

    if (
      error.message?.includes("not found") ||
      error.message?.includes("already taken")
    ) {
      return response(404, { error: error.message });
    }

    return response(500, { error: "Internal server error" });
  }
};

