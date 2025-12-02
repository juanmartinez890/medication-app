import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { DoseService } from "../services/doseService";
import { DoseRepository } from "../repositories/doseRepository";
import { MedicationRepository } from "../repositories/medicationRepository";
import { response } from "../utils/response";

const TABLE_NAME = process.env.MEDICATIONS_TABLE_NAME || "";

const careRecipientSchema = z.object({
  careRecipientId: z.string().min(1, "careRecipientId is required"),
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
    const careRecipientId =
      event.pathParameters?.careRecipientId ||
      event.queryStringParameters?.careRecipientId;

    const parsed = careRecipientSchema.safeParse({ careRecipientId });

    if (!parsed.success) {
      return response(400, {
        error: parsed.error.errors[0]?.message || "Invalid input",
      });
    }

    const { service } = buildContext();
    const doses = await service.getUpcomingDoses(parsed.data.careRecipientId);

    return response(200, doses);
  } catch (error) {
    console.error("Error retrieving upcoming doses:", error);
    return response(500, { error: "Internal server error" });
  }
};

