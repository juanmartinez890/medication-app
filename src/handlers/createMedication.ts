import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { MedicationService } from "../services/medicationService";
import { MedicationRepository } from "../repositories/medicationRepository";
import { SQSService } from "../services/sqsService";
import { CreateMedicationRequest } from "../domain/types";
import { ValidationError } from "../utils/validation";

const TABLE_NAME = process.env.MEDICATIONS_TABLE_NAME || "";
const QUEUE_URL = process.env.DOSE_GENERATION_QUEUE_URL || "";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Request body is required" }),
      };
    }

    const request: CreateMedicationRequest = JSON.parse(event.body);

    // Initialize service and repository
    const repository = new MedicationRepository(TABLE_NAME);
    const sqsService = QUEUE_URL ? new SQSService(QUEUE_URL) : undefined;
    const service = new MedicationService(repository, sqsService);

    // Create medication
    const medication = await service.createMedication(request);

    return {
      statusCode: 201,
      body: JSON.stringify({
        medication,
      }),
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: error.message }),
      };
    }

    console.error("Error creating medication:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
      }),
    };
  }
};

