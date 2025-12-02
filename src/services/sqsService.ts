import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { DoseGenerationMessage } from "../domain/types";

export class SQSService {
  private sqsClient: SQSClient;
  private queueUrl: string;

  constructor(queueUrl: string) {
    this.sqsClient = new SQSClient({});
    this.queueUrl = queueUrl;
  }

  async sendDoseGenerationMessage(
    message: DoseGenerationMessage
  ): Promise<void> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message),
    });

    await this.sqsClient.send(command);
  }
}

