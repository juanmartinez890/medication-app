import { APIGatewayProxyResult } from "aws-lambda";

export const response = (
  statusCode: number,
  body: unknown
): APIGatewayProxyResult => ({
  statusCode,
  body: JSON.stringify(body),
});

