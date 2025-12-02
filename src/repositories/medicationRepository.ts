import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  BatchGetItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Medication } from "../domain/types";

export class MedicationRepository {
  private dynamoClient: DynamoDBClient;
  private tableName: string;

  constructor(tableName: string) {
    this.dynamoClient = new DynamoDBClient({});
    this.tableName = tableName;
  }

  async create(medication: Medication): Promise<Medication> {
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(medication),
    });

    await this.dynamoClient.send(command);
    return medication;
  }

  async getById(PK: string, SK: string): Promise<Medication | null> {
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({ PK, SK }),
    });

    const result = await this.dynamoClient.send(command);

    if (!result.Item) {
      return null;
    }

    return unmarshall(result.Item) as Medication;
  }

  async getByIds(keys: Array<{ PK: string; SK: string }>): Promise<Medication[]> {
    if (keys.length === 0) {
      return [];
    }

    // DynamoDB BatchGetItem can handle up to 100 items, but we'll process in batches of 100
    const BATCH_SIZE = 100;
    const medications: Medication[] = [];

    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batch = keys.slice(i, i + BATCH_SIZE);
      const command = new BatchGetItemCommand({
        RequestItems: {
          [this.tableName]: {
            Keys: batch.map((key) => marshall(key)),
          },
        },
      });

      const result = await this.dynamoClient.send(command);
      const responses = result.Responses?.[this.tableName] || [];

      medications.push(
        ...responses.map((item) => unmarshall(item) as Medication)
      );
    }

    return medications;
  }

  async updateActive(
    PK: string,
    SK: string,
    active: boolean
  ): Promise<Medication | null> {
    const command = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({ PK, SK }),
      UpdateExpression: "SET active = :active",
      ExpressionAttributeValues: marshall({
        ":active": active,
      }),
      ReturnValues: "ALL_NEW",
    });

    const result = await this.dynamoClient.send(command);

    if (!result.Attributes) {
      return null;
    }

    return unmarshall(result.Attributes) as Medication;
  }
}

