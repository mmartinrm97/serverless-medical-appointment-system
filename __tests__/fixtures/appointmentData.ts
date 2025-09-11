import {
  Appointment,
  type CountryISO,
} from '../../src/modules/appointments/domain/entities/Appointment.js';
import {
  createAppointmentConfirmedEvent,
  type AppointmentConfirmedData,
} from '../../src/modules/appointments/domain/events/AppointmentConfirmed.js';

// Base appointment data for creation
export const mockAppointmentData = {
  insuredId: '12345',
  scheduleId: 100,
  countryISO: 'PE' as CountryISO,
  centerId: 1,
  specialtyId: 10,
  medicId: 20,
  slotDatetime: new Date('2024-01-15T10:00:00Z'),
};

// Complete appointment entity
export const mockAppointment = Appointment.create(mockAppointmentData);

// Appointment from persistence with specific ID
export const mockAppointmentFromPersistence = Appointment.fromPersistence({
  appointmentId: '01HKNEX123456789ABCDEFGHIJ',
  insuredId: '12345',
  scheduleId: 100,
  countryISO: 'PE',
  status: 'pending',
  createdAt: new Date('2024-01-10T08:00:00Z'),
  updatedAt: new Date('2024-01-10T08:00:00Z'),
  centerId: 1,
  specialtyId: 10,
  medicId: 20,
  slotDatetime: new Date('2024-01-15T10:00:00Z'),
});

// Multiple appointments for list scenarios
export const mockAppointmentsList = [
  Appointment.fromPersistence({
    appointmentId: '01HKNEX123456789ABCDEFGH01',
    insuredId: '12345',
    scheduleId: 100,
    countryISO: 'PE',
    status: 'pending',
    createdAt: new Date('2024-01-10T08:00:00Z'),
    updatedAt: new Date('2024-01-10T08:00:00Z'),
    centerId: 1,
    specialtyId: 10,
  }),
  Appointment.fromPersistence({
    appointmentId: '01HKNEX123456789ABCDEFGH02',
    insuredId: '12345',
    scheduleId: 101,
    countryISO: 'CL',
    status: 'completed',
    createdAt: new Date('2024-01-10T09:00:00Z'),
    updatedAt: new Date('2024-01-11T10:00:00Z'),
    centerId: 2,
    specialtyId: 11,
  }),
];

// Event fixtures
export const mockAppointmentConfirmedEventData: AppointmentConfirmedData = {
  appointmentId: '01HKNEX123456789ABCDEFGHIJ',
  insuredId: '12345',
  scheduleId: 100,
  countryISO: 'PE',
  processedAt: '2024-01-10T08:00:00.000Z',
  source: 'appointment_pe',
};

export const mockAppointmentConfirmedEvent = createAppointmentConfirmedEvent({
  appointmentId: '01HKNEX123456789ABCDEFGHIJ',
  insuredId: '12345',
  scheduleId: 100,
  countryISO: 'PE',
  source: 'appointment_pe',
});

// DynamoDB response fixtures
export const mockDynamoDBItem = {
  id: { S: '01HKNEX123456789ABCDEFGHIJ' },
  insuredId: { S: 'INS-123456' },
  doctorId: { S: 'DOC-789012' },
  specialtyId: { S: 'SPEC-001' },
  date: { S: '2024-01-15' },
  time: { S: '10:00' },
  country: { S: 'PE' },
  status: { S: 'SCHEDULED' },
  notes: { S: 'Consulta de rutina' },
  createdAt: { S: '2024-01-10T08:00:00.000Z' },
  updatedAt: { S: '2024-01-10T08:00:00.000Z' },
};

export const mockDynamoDBQueryResponse = {
  Items: [mockDynamoDBItem],
  Count: 1,
  ScannedCount: 1,
};

// HTTP event fixtures
export const mockPostAppointmentRequest = {
  insuredId: 'INS-123456',
  doctorId: 'DOC-789012',
  specialtyId: 'SPEC-001',
  date: '2024-01-15',
  time: '10:00',
  country: 'PE',
  notes: 'Consulta de rutina',
};

export const mockGetAppointmentsPathParams = {
  insuredId: 'INS-123456',
};

// SNS message fixtures
export const mockSNSMessage = {
  eventType: 'AppointmentConfirmed',
  appointmentId: '01HKNEX123456789ABCDEFGHIJ',
  insuredId: 'INS-123456',
  country: 'PE',
  timestamp: '2024-01-10T08:00:00.000Z',
};

// Error fixtures
export const mockDynamoDBError = new Error('DynamoDB operation failed');
export const mockSNSError = new Error('SNS publish failed');
export const mockValidationError = new Error(
  'Validation failed: Invalid date format'
);
