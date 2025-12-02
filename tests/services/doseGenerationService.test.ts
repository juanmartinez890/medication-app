import { DoseGenerationService } from '../../src/services/doseGenerationService';
import { DoseRepository } from '../../src/repositories/doseRepository';
import { DoseGenerationMessage } from '../../src/domain/types';

describe('DoseGenerationService', () => {
  let doseRepository: jest.Mocked<DoseRepository>;
  let service: DoseGenerationService;

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    doseRepository = {
      batchCreate: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DoseRepository>;

    service = new DoseGenerationService(doseRepository);
  });

  it('generates doses for the next 7 days for DAILY recurrence', async () => {
    const message: DoseGenerationMessage = {
      medicationId: 'med-1',
      careRecipientId: '67891',
      recurrence: 'DAILY',
      timesOfDay: ['08:00', '20:00'],
      daysOfWeek: null,
      active: true,
    };

    const count = await service.generateDoses(message);

    // 7 days * 2 times per day = 14 doses
    expect(count).toBe(14);
    expect(doseRepository.batchCreate).toHaveBeenCalledTimes(1);
    const [doses] = doseRepository.batchCreate.mock.calls[0];
    expect(doses).toHaveLength(14);

    // Basic shape checks
    const firstDose = doses[0];
    expect(firstDose.PK).toBe('CARE#67891');
    expect(firstDose.SK).toContain('DOSE#med-1#');
    expect(firstDose.status).toBe('UPCOMING');
  });

  it('generates doses for the next 7 days for WEEKLY recurrence', async () => {
    const message: DoseGenerationMessage = {
      medicationId: 'med-weekly-1',
      careRecipientId: '67891',
      recurrence: 'WEEKLY',
      timesOfDay: null,
      daysOfWeek: [3], // Wednesday
      active: true,
    };

    const count = await service.generateDoses(message);

    // With 7 days and a single dayOfWeek, we expect exactly 1 dose
    expect(count).toBe(1);
    expect(doseRepository.batchCreate).toHaveBeenCalledTimes(1);
    const [doses] = doseRepository.batchCreate.mock.calls[0];
    expect(doses).toHaveLength(1);
    expect(doses[0].PK).toBe('CARE#67891');
    expect(doses[0].status).toBe('UPCOMING');
  });

  it('does not generate doses for inactive medications', async () => {
    const message: DoseGenerationMessage = {
      medicationId: 'med-inactive',
      careRecipientId: '67891',
      recurrence: 'DAILY',
      timesOfDay: ['08:00'],
      daysOfWeek: null,
      active: false,
    };

    const count = await service.generateDoses(message);

    expect(count).toBe(0);
    expect(doseRepository.batchCreate).not.toHaveBeenCalled();
  });
});


