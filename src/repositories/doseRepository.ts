import {
  DynamoDBClient,
  BatchWriteItemCommand,
  WriteRequest,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Dose } from "../domain/types";

export class DoseRepository {
  private dynamoClient: DynamoDBClient;
  private tableName: string;
  private readonly BATCH_SIZE = 25; // DynamoDB batch write limit

  constructor(tableName: string) {
    this.dynamoClient = new DynamoDBClient({});
    this.tableName = tableName;
  }

  async batchCreate(doses: Dose[]): Promise<void> {
    // DynamoDB BatchWriteItem can handle up to 25 items at a time
    for (let i = 0; i < doses.length; i += this.BATCH_SIZE) {
      const batch = doses.slice(i, i + this.BATCH_SIZE);
      const writeRequests: WriteRequest[] = batch.map((dose) => ({
        PutRequest: {
          Item: marshall(dose),
        },
      }));

      const command = new BatchWriteItemCommand({
        RequestItems: {
          [this.tableName]: writeRequests,
        },
      });

      await this.dynamoClient.send(command);
    }
  }

  async findUpcomingDoses(
    careRecipientId: string,
    currentTime: string
  ): Promise<Dose[]> {
    const PK = `CARE#${careRecipientId}`;

    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      FilterExpression: "#status = :status AND dueAt >= :currentTime",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: marshall({
        ":pk": PK,
        ":skPrefix": "DOSE#",
        ":status": "UPCOMING",
        ":currentTime": currentTime,
      }),
    });

    const result = await this.dynamoClient.send(command);

    if (!result.Items) {
      return [];
    }

    return result.Items.map((item) => unmarshall(item) as Dose);
  }

  async markAsTaken(
    careRecipientId: string,
    medicationId: string,
    dueAt: string
  ): Promise<Dose | null> {
    const PK = `CARE#${careRecipientId}`;
    const SK = `DOSE#${medicationId}#${dueAt}`;
    const now = new Date().toISOString();

    const command = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({ PK, SK }),
      UpdateExpression:
        "SET #status = :status, takenAt = :takenAt, updatedAt = :updatedAt",
      ConditionExpression: "#status = :upcomingStatus",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: marshall({
        ":status": "TAKEN",
        ":takenAt": now,
        ":updatedAt": now,
        ":upcomingStatus": "UPCOMING",
      }),
      ReturnValues: "ALL_NEW",
    });

    try {
      const result = await this.dynamoClient.send(command);
      if (!result.Attributes) {
        return null;
      }
      return unmarshall(result.Attributes) as Dose;
    } catch (error: any) {
      // If condition fails, dose doesn't exist or is not UPCOMING
      if (error.name === "ConditionalCheckFailedException") {
        return null;
      }
      throw error;
    }
  }
}

