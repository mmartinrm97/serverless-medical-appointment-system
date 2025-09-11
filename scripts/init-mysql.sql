-- MySQL initialization script for both PE and CL databases

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  insured_id CHAR(5) NOT NULL,
  schedule_id BIGINT NOT NULL,
  center_id INT,
  specialty_id INT,
  medic_id INT,
  slot_datetime DATETIME(3),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_insured_id (insured_id),
  INDEX idx_schedule_id (schedule_id),
  INDEX idx_slot_datetime (slot_datetime),
  UNIQUE KEY uk_insured_schedule (insured_id, schedule_id)
);

-- Insert some sample data for testing
INSERT INTO appointments (insured_id, schedule_id, center_id, specialty_id, medic_id, slot_datetime) VALUES
('12345', 100, 1, 2, 3, '2024-12-01 10:30:00.000'),
('12345', 101, 1, 3, 4, '2024-12-02 14:00:00.000'),
('67890', 102, 2, 1, 2, '2024-12-03 09:15:00.000');
