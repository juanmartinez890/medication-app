# Medication Management API

A serverless medication management system built with AWS Lambda, API Gateway, DynamoDB, and SQS. This application allows care recipients to manage their medications and track dose schedules.

## 🏗️ Architecture

- **API Gateway (HTTP API)**: RESTful API endpoints
- **AWS Lambda**: Serverless functions for business logic
- **DynamoDB**: NoSQL database for medications and doses
- **SQS**: Message queue for asynchronous dose generation
- **TypeScript**: Type-safe development
- **Serverless Framework**: Infrastructure as code

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20.x or higher)
- **npm** or **yarn**
- **AWS CLI** configured with appropriate credentials
- **Serverless Framework** CLI (install globally: `npm install -g serverless`)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 3. Deploy to AWS

```bash
npm run deploy
# or
serverless deploy
```

After deployment, you'll see output with your API endpoints:

```
endpoints:
  POST - https://xxxxx.execute-api.us-east-1.amazonaws.com/medications
  GET - https://xxxxx.execute-api.us-east-1.amazonaws.com/care-recipients/{careRecipientId}/doses/upcoming
  POST - https://xxxxx.execute-api.us-east-1.amazonaws.com/care-recipients/{careRecipientId}/doses/taken
```

**Note:** Save the base URL (e.g., `https://xxxxx.execute-api.us-east-1.amazonaws.com`) for testing.

### 4. Local Development (Optional)

For local development with hot-reload:

```bash
npm run dev
# or
serverless dev
```

This starts a local development server that tunnels requests to AWS Lambda.

## 🧪 Testing the API

### Prerequisites for Testing

- API base URL from deployment output
- `curl` or any HTTP client (Postman, Insomnia, etc.)

### Test Scenario: Complete Medication Workflow

#### Step 1: Create a Daily Medication

```bash
curl -X POST https://YOUR_API_URL/medications \
  -H "Content-Type: application/json" \
  -d '{
    "careRecipientId": "67891",
    "name": "Ibuprofen",
    "dosage": "200mg",
    "notes": "Take with food",
    "recurrence": "DAILY",
    "timesOfDay": ["08:00", "20:00"],
    "daysOfWeek": null,
    "active": true
  }'
```

**Expected Response (201):**
```json
{
  "medication": {
    "PK": "CARE#67891",
    "SK": "MED#550e8400-e29b-41d4-a716-446655440000",
    "medicationId": "550e8400-e29b-41d4-a716-446655440000",
    "careRecipientId": "67891",
    "name": "Ibuprofen",
    "dosage": "200mg",
    "notes": "Take with food",
    "recurrence": "DAILY",
    "timesOfDay": ["08:00", "20:00"],
    "daysOfWeek": null,
    "active": true,
    "createdAt": "2025-01-20T12:00:00.000Z",
    "updatedAt": "2025-01-20T12:00:00.000Z"
  }
}
```

**Save the `medicationId` from the response for later steps.**

#### Step 2: Create a Weekly Medication

```bash
curl -X POST https://YOUR_API_URL/medications \
  -H "Content-Type: application/json" \
  -d '{
    "careRecipientId": "67891",
    "name": "Vitamin D",
    "dosage": "1000 IU",
    "notes": "Take once per week",
    "recurrence": "WEEKLY",
    "timesOfDay": null,
    "daysOfWeek": [1, 3, 5],
    "active": true
  }'
```

#### Step 3: Wait for Dose Generation

After creating medications, the system automatically:
1. Publishes a message to SQS
2. Triggers a Lambda function to generate 30 days of doses
3. Stores doses in DynamoDB

**Wait 10-30 seconds** for the background process to complete.

#### Step 4: Get Upcoming Doses

```bash
curl https://YOUR_API_URL/care-recipients/67891/doses/upcoming
```

**Expected Response (200):**
```json
[
  {
    "doseId": "DOSE#550e8400-e29b-41d4-a716-446655440000#2025-12-01T08:00:00.000Z",
    "medicationId": "550e8400-e29b-41d4-a716-446655440000",
    "careRecipientId": "67891",
    "dueAt": "2025-12-01T08:00:00.000Z",
    "status": "UPCOMING",
    "medication": {
      "name": "Ibuprofen",
      "dosage": "200mg",
      "recurrence": "DAILY",
      "notes": "Take with food"
    }
  }
]
```

**Save the `doseId`, `medicationId`, and `dueAt` from the response for the next step.**

#### Step 5: Mark a Dose as Taken

```bash
curl -X POST https://YOUR_API_URL/care-recipients/67891/doses/taken \
  -H "Content-Type: application/json" \
  -d '{
    "medicationId": "550e8400-e29b-41d4-a716-446655440000",
    "dueAt": "2025-12-01T08:00:00.000Z"
  }'
```

**Expected Response (200):**
```json
{
  "message": "Dose marked as taken",
  "dose": {
    "medicationId": "550e8400-e29b-41d4-a716-446655440000",
    "careRecipientId": "67891",
    "dueAt": "2025-12-01T08:00:00.000Z",
    "takenAt": "2025-12-01T10:30:00.000Z",
    "status": "TAKEN"
  }
}
```

#### Step 6: Verify Updated Status

Get upcoming doses again - the taken dose should no longer appear (since it's no longer "UPCOMING"):

```bash
curl https://YOUR_API_URL/care-recipients/67891/doses/upcoming
```

## 📚 API Endpoints

### POST `/medications`

Create a new medication record.

**Request Body:**
```json
{
  "careRecipientId": "string (required)",
  "name": "string (required)",
  "dosage": "string (required)",
  "notes": "string",
  "recurrence": "DAILY | WEEKLY (required)",
  "timesOfDay": ["HH:MM"] | null,  // Required for DAILY
  "daysOfWeek": [0-6] | null,       // Required for WEEKLY (0=Sunday)
  "active": boolean                 // Optional, defaults to true
}
```

### GET `/care-recipients/{careRecipientId}/doses/upcoming`

Get all upcoming doses for a care recipient.

**Path Parameters:**
- `careRecipientId` (required)

**Response:** Array of dose objects with medication details

### POST `/care-recipients/{careRecipientId}/doses/taken`

Mark a dose as taken.

**Path Parameters:**
- `careRecipientId` (required)

**Request Body:**
```json
{
  "medicationId": "string (required)",
  "dueAt": "ISO 8601 datetime (required)"
}
```

## 🔍 Validation Rules

### Daily Medications
- `timesOfDay` must be provided (array of "HH:MM" format times)
- `daysOfWeek` must be `null`
- Time format: `"08:00"`, `"20:00"` (24-hour format)

### Weekly Medications
- `daysOfWeek` must be provided (array of 0-6, where 0=Sunday)
- `timesOfDay` must be `null`
- Days: `0` = Sunday, `1` = Monday, ..., `6` = Saturday

## 🗑️ Cleanup

To remove all AWS resources:

```bash
serverless remove
```

**Warning:** This will delete the DynamoDB table and all data!

## 📁 Project Structure

```
medication-app/
├── src/
│   ├── handlers/          # Lambda function handlers
│   │   ├── createMedication.ts
│   │   ├── getUpcomingDoses.ts
│   │   └── markDoseAsTaken.ts
│   ├── services/          # Business logic
│   │   ├── medicationService.ts
│   │   ├── doseService.ts
│   │   └── doseGenerationService.ts
│   ├── repositories/      # Data access layer
│   │   ├── medicationRepository.ts
│   │   └── doseRepository.ts
│   ├── domain/            # Type definitions
│   │   └── types.ts
│   └── utils/             # Utility functions
│       ├── response.ts
│       ├── validation.ts
│       └── dateUtils.ts
├── dist/                  # Compiled JavaScript (generated)
├── serverless.yml         # Serverless configuration
├── tsconfig.json          # TypeScript configuration
└── package.json
```

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy to AWS
npm run deploy

# Local development with hot-reload
npm run dev

# Remove all AWS resources
serverless remove
```

## 🔐 Security Notes

- The API is currently **public** (no authentication)
- For production, consider adding:
  - API Gateway authorizers
  - AWS Cognito integration
  - API keys or custom authorizers

## 📝 Notes

- Dose generation happens asynchronously via SQS (may take 10-30 seconds)
- Doses are generated 30 days in advance
- Only doses with `status: "UPCOMING"` can be marked as taken
- The `doseId` format is: `DOSE#<medicationId>#<ISO8601-timestamp>`

## 🐛 Troubleshooting

### CORS Errors
- Ensure CORS is configured in `serverless.yml` (already included)
- Check that your frontend origin matches the allowed origins

### Dose Generation Not Working
- Check SQS queue in AWS Console
- Verify Lambda function logs in CloudWatch
- Ensure the `generateDoses` function has proper IAM permissions

### "AccessDeniedException" Errors
- Verify IAM permissions in `serverless.yml`
- Ensure DynamoDB table exists and permissions are correct

## 📄 License

This project is part of a medication management system.
