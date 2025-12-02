import { MedicationService } from '../../src/services/medicationService';
import { MedicationRepository } from '../../src/repositories/medicationRepository';
import { DoseGenerationService } from '../../src/services/doseGenerationService';
import { CreateMedicationRequest, Medication } from '../../src/domain/types';

// Mock uuid so medicationId is deterministic
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-medication-id'),
}));

describe('MedicationService', () => {
  let medicationRepository: jest.Mocked<MedicationRepository>;
  let doseGenerationService: jest.Mocked<DoseGenerationService>;
  let service: MedicationService;

  beforeEach(() => {
    medicationRepository = {
      create: jest.fn(),
    } as unknown as jest.Mocked<MedicationRepository>;

    doseGenerationService = {
      generateDoses: jest.fn().mockResolvedValue(7),
    } as unknown as jest.Mocked<DoseGenerationService>;

    service = new MedicationService(medicationRepository, doseGenerationService);
  });

  it('creates a medication with correct PK/SK and generates doses', async () => {
    const request: CreateMedicationRequest = {
      careRecipientId: '67891',
      name: 'Ibuprofen',
      dosage: '200mg',
      notes: 'Take with food',
      recurrence: 'DAILY',
      timesOfDay: ['08:00', '20:00'],
      daysOfWeek: null,
      active: true,
    };

    // Stub repository create to echo back the medication
    medicationRepository.create.mockImplementation(
      async (med: Medication) => med
    );

    const medication = await service.createMedication(request);

    // PK/SK formatting
    expect(medication.PK).toBe('CARE#67891');
    expect(medication.SK).toBe('MED#test-medication-id');
    expect(medication.medicationId).toBe('test-medication-id');

    // Repository was called with the same object
    expect(medicationRepository.create).toHaveBeenCalledTimes(1);

    // Dose generation was invoked with the expected message
    expect(doseGenerationService.generateDoses).toHaveBeenCalledTimes(1);
    const [message] = doseGenerationService.generateDoses.mock.calls[0];
    expect(message.medicationId).toBe('test-medication-id');
    expect(message.careRecipientId).toBe('67891');
    expect(message.recurrence).toBe('DAILY');
    expect(message.timesOfDay).toEqual(['08:00', '20:00']);
    expect(message.daysOfWeek).toBeNull();
    expect(message.active).toBe(true);
  });
});


