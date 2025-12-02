import { DoseService } from '../../src/services/doseService';
import { DoseRepository } from '../../src/repositories/doseRepository';
import { MedicationRepository } from '../../src/repositories/medicationRepository';
import { Dose, Medication } from '../../src/domain/types';

describe('DoseService', () => {
  let doseRepository: jest.Mocked<DoseRepository>;
  let medicationRepository: jest.Mocked<MedicationRepository>;
  let service: DoseService;

  beforeEach(() => {
    doseRepository = {
      findUpcomingDoses: jest.fn(),
      markAsTaken: jest.fn(),
    } as unknown as jest.Mocked<DoseRepository>;

    medicationRepository = {
      getByIds: jest.fn(),
    } as unknown as jest.Mocked<MedicationRepository>;

    service = new DoseService(doseRepository, medicationRepository);
  });

  it('returns empty array when there are no upcoming doses', async () => {
    doseRepository.findUpcomingDoses.mockResolvedValue([]);

    const result = await service.getUpcomingDoses('67891');

    expect(result).toEqual([]);
    expect(doseRepository.findUpcomingDoses).toHaveBeenCalledTimes(1);
    expect(medicationRepository.getByIds).not.toHaveBeenCalled();
  });

  it('maps doses with medication details and deduplicates medication fetches', async () => {
    const doses: Dose[] = [
      {
        PK: 'CARE#67891',
        SK: 'DOSE#med-1#2025-12-01T08:00:00.000Z',
        medicationId: 'med-1',
        careRecipientId: '67891',
        dueAt: '2025-12-01T08:00:00.000Z',
        takenAt: null,
        status: 'UPCOMING',
        createdAt: '2025-11-25T12:00:00.000Z',
        updatedAt: '2025-11-25T12:00:00.000Z',
      },
      {
        PK: 'CARE#67891',
        SK: 'DOSE#med-1#2025-12-01T20:00:00.000Z',
        medicationId: 'med-1',
        careRecipientId: '67891',
        dueAt: '2025-12-01T20:00:00.000Z',
        takenAt: null,
        status: 'UPCOMING',
        createdAt: '2025-11-25T12:00:00.000Z',
        updatedAt: '2025-11-25T12:00:00.000Z',
      },
    ];

    const medication: Medication = {
      PK: 'CARE#67891',
      SK: 'MED#med-1',
      medicationId: 'med-1',
      careRecipientId: '67891',
      name: 'Ibuprofen',
      dosage: '200mg',
      notes: 'Take with food',
      recurrence: 'DAILY',
      timesOfDay: ['08:00', '20:00'],
      daysOfWeek: null,
      active: true,
      createdAt: '2025-11-20T12:00:00.000Z',
      updatedAt: '2025-11-20T12:00:00.000Z',
    };

    doseRepository.findUpcomingDoses.mockResolvedValue(doses);
    medicationRepository.getByIds.mockResolvedValue([medication]);

    const result = await service.getUpcomingDoses('67891');

    expect(doseRepository.findUpcomingDoses).toHaveBeenCalledTimes(1);
    expect(medicationRepository.getByIds).toHaveBeenCalledTimes(1);

    // Should have 2 results, both with the same medication details
    expect(result).toHaveLength(2);
    expect(result[0].doseId).toBe(doses[0].SK);
    expect(result[0].medicationId).toBe('med-1');
    expect(result[0].medication.name).toBe('Ibuprofen');
    expect(result[1].medication.dosage).toBe('200mg');
  });
}


