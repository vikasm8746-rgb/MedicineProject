-- =============================================================================
-- MediFind - Medicine Availability Finder Database Schema
-- Database: MySQL 8.0+
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `medifind_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `medifind_db`;

-- Drop existing tables in reverse dependency order
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `search_history`;
DROP TABLE IF EXISTS `favorites`;
DROP TABLE IF EXISTS `reservations`;
DROP TABLE IF EXISTS `inventory`;
DROP TABLE IF EXISTS `medicines`;
DROP TABLE IF EXISTS `pharmacies`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `phone` VARCHAR(20) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('user', 'pharmacy_owner', 'admin') NOT NULL DEFAULT 'user',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. PHARMACIES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE `pharmacies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `owner_id` INT NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `address` TEXT NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `opening_hours` VARCHAR(100) NOT NULL DEFAULT '08:00 AM - 10:00 PM',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_pharmacies_owner` (`owner_id`),
  INDEX `idx_pharmacies_name` (`name`),
  CONSTRAINT `fk_pharmacies_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. MEDICINES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE `medicines` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `brand_name` VARCHAR(200) NOT NULL,
  `generic_name` VARCHAR(200) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `manufacturer` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `usage_info` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_medicines_name` (`name`),
  INDEX `idx_medicines_brand` (`brand_name`),
  INDEX `idx_medicines_generic` (`generic_name`),
  INDEX `idx_medicines_category` (`category`),
  FULLTEXT KEY `ft_medicines_search` (`name`, `brand_name`, `generic_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. INVENTORY TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE `inventory` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pharmacy_id` INT NOT NULL,
  `medicine_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `expiry_date` DATE NOT NULL,
  `availability_status` ENUM('Available', 'Low Stock', 'Out of Stock') NOT NULL DEFAULT 'Available',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_pharmacy_medicine` (`pharmacy_id`, `medicine_id`),
  INDEX `idx_inventory_status` (`availability_status`),
  CONSTRAINT `fk_inventory_pharmacy` FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inventory_medicine` FOREIGN KEY (`medicine_id`) REFERENCES `medicines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. RESERVATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE `reservations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `pharmacy_id` INT NOT NULL,
  `medicine_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `status` ENUM('Pending', 'Accepted', 'Rejected', 'Completed') NOT NULL DEFAULT 'Pending',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_reservations_user` (`user_id`),
  INDEX `idx_reservations_pharmacy` (`pharmacy_id`),
  INDEX `idx_reservations_status` (`status`),
  CONSTRAINT `fk_reservations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reservations_pharmacy` FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reservations_medicine` FOREIGN KEY (`medicine_id`) REFERENCES `medicines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. FAVORITES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE `favorites` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `medicine_id` INT DEFAULT NULL,
  `pharmacy_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_fav_medicine` (`user_id`, `medicine_id`),
  UNIQUE KEY `uk_user_fav_pharmacy` (`user_id`, `pharmacy_id`),
  INDEX `idx_favorites_user` (`user_id`),
  CONSTRAINT `fk_favorites_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_favorites_medicine` FOREIGN KEY (`medicine_id`) REFERENCES `medicines` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_favorites_pharmacy` FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. SEARCH HISTORY TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE `search_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `search_query` VARCHAR(255) NOT NULL,
  `searched_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_search_history_user` (`user_id`),
  INDEX `idx_search_history_time` (`searched_at`),
  CONSTRAINT `fk_search_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SAMPLE / DEMO DATA FOR TESTING & EVALUATION
-- Default password for all seed accounts: "password123"
-- bcrypt hash: $2a$10$3zZ4vMv1B1T0f4aA7W9eEuq8P5b6J1Zl9x0V4K8qX1n2Y3Z4m5W6e
-- =============================================================================

-- Seed Users
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`) VALUES
(1, 'Rahul Sharma', 'rahul@example.com', '+91 9876543210', '$2a$10$7vF5fG8j2W9wK1q7e8r0uuL5M6n7O8p9Q0r1S2t3U4v5W6x7Y8z9A', 'user'),
(2, 'Dr. Sunita Patel (Apex Pharma)', 'sunita@apexpharma.com', '+91 9822012345', '$2a$10$7vF5fG8j2W9wK1q7e8r0uuL5M6n7O8p9Q0r1S2t3U4v5W6x7Y8z9A', 'pharmacy_owner'),
(3, 'Vikram Mehta (City Meds)', 'vikram@citymeds.com', '+91 9765432100', '$2a$10$7vF5fG8j2W9wK1q7e8r0uuL5M6n7O8p9Q0r1S2t3U4v5W6x7Y8z9A', 'pharmacy_owner'),
(4, 'Admin Manager', 'admin@medifind.com', '+91 9900112233', '$2a$10$7vF5fG8j2W9wK1q7e8r0uuL5M6n7O8p9Q0r1S2t3U4v5W6x7Y8z9A', 'admin');

-- Seed Pharmacies
INSERT INTO `pharmacies` (`id`, `owner_id`, `name`, `address`, `phone`, `opening_hours`) VALUES
(1, 2, 'Apex Care Pharmacy', 'Shop 14, Sunrise Complex, MG Road, Bengaluru', '+91 80 2345 6789', '08:00 AM - 11:00 PM'),
(2, 3, 'City Meds 24x7', 'Plot 45, Near Metro Station, Indiranagar, Bengaluru', '+91 80 4123 9876', '24 Hours Open'),
(3, 2, 'Wellness First Chemist', '12th Main, Koramangala 4th Block, Bengaluru', '+91 80 5566 7788', '08:30 AM - 10:30 PM'),
(4, 3, 'LifeLine Healthcare & Druggists', '77 Central Avenue, Jayanagar 3rd Block, Bengaluru', '+91 80 6677 8899', '09:00 AM - 10:00 PM'),
(5, 2, 'MedPlus Community Chemist', '89 Ring Road, HSR Layout Sector 1, Bengaluru', '+91 80 7788 9900', '08:00 AM - 10:00 PM');

-- Seed Medicines (12 detailed medicines across core healthcare categories)
INSERT INTO `medicines` (`id`, `name`, `brand_name`, `generic_name`, `category`, `manufacturer`, `description`, `usage_info`) VALUES
(1, 'Paracetamol 650mg', 'Dolo 650', 'Paracetamol / Acetaminophen', 'Fever & Pain', 'Micro Labs Ltd', 'Effective antipyretic and analgesic used to relieve mild-to-moderate pain and fever.', 'Take 1 tablet every 4 to 6 hours as needed. Do not exceed 4g in 24 hours. Availability lookup only; consult physician.'),
(2, 'Amoxicillin 500mg', 'Mox 500', 'Amoxicillin Trihydrate', 'Antibiotics', 'Sun Pharmaceutical', 'Broad-spectrum penicillin antibiotic used for bacterial infections of ear, nose, throat, and respiratory tract.', 'Usually prescribed three times daily. Complete full course as prescribed by registered doctor.'),
(3, 'Cetirizine 10mg', 'Cetzine', 'Cetirizine Hydrochloride', 'Cold & Cough', 'Dr. Reddy’s Laboratories', 'Second-generation antihistamine used to relieve allergy symptoms such as watery eyes, runny nose, and hives.', 'Take 1 tablet once daily in the evening. May cause mild drowsiness.'),
(4, 'Metformin 500mg', 'Glycomet 500', 'Metformin Hydrochloride', 'Diabetes', 'USV Private Limited', 'First-line medication for the treatment of type 2 diabetes mellitus, helping control blood sugar.', 'Take with meals to minimize gastrointestinal discomfort. Regular blood sugar monitoring advised.'),
(5, 'Atorvastatin 10mg', 'Lipitor / Atorva', 'Atorvastatin Calcium', 'Heart Care', 'Zydus Lifesciences', 'HMG-CoA reductase inhibitor (statin) used to lower bad cholesterol (LDL) and triglycerides.', 'Take once daily at bedtime with or without food.'),
(6, 'Vitamin D3 60,000 IU', 'Calcirol Sachet', 'Cholecalciferol', 'Vitamins', 'Cadila Healthcare', 'High potency Vitamin D3 formulation used in the treatment and prevention of vitamin D deficiency and osteoporosis.', 'Usually taken once weekly with milk for a specified duration as instructed by doctor.'),
(7, 'Azithromycin 500mg', 'Azee 500', 'Azithromycin', 'Antibiotics', 'Cipla Ltd', 'Macrolide antibiotic used for respiratory tract, skin, and ear infections.', 'Take once daily on an empty stomach 1 hour before or 2 hours after meals.'),
(8, 'Pantoprazole 40mg', 'Pan 40', 'Pantoprazole Sodium', 'Gastro Care', 'Alkem Laboratories', 'Proton pump inhibitor that decreases the amount of acid produced in the stomach, treating GERD and ulcers.', 'Take once daily in the morning, 30 to 60 minutes before breakfast.'),
(9, 'Telmisartan 40mg', 'Telma 40', 'Telmisartan', 'Heart Care', 'Glenmark Pharmaceuticals', 'Angiotensin II receptor blocker (ARB) used for the treatment of high blood pressure and hypertension.', 'Take once daily at the same time each day, with or without food.'),
(10, 'Ibuprofen 400mg', 'Brufen 400', 'Ibuprofen', 'Fever & Pain', 'Abbott Healthcare', 'Nonsteroidal anti-inflammatory drug (NSAID) used for relieving pain, inflammation, and fever.', 'Take after food or with milk to avoid stomach upset. Short-term use only.'),
(11, 'Salbutamol Inhaler 100mcg', 'Asthalin Inhaler', 'Salbutamol / Albuterol', 'Cold & Cough', 'Cipla Ltd', 'Bronchodilator fast-acting inhaler for quick relief from asthma and bronchospasm.', 'Inhale 1-2 puffs during sudden shortness of breath or before exercise.'),
(12, 'Povidone Iodine Ointment 5%', 'Betadine 5%', 'Povidone Iodine', 'First Aid', 'Win-Medicare', 'Topical antiseptic applied to cuts, wounds, abrasions, and minor burns to prevent bacterial infection.', 'Clean the affected wound thoroughly and apply a thin layer 1-3 times daily.');

-- Seed Inventory
INSERT INTO `inventory` (`pharmacy_id`, `medicine_id`, `quantity`, `price`, `expiry_date`, `availability_status`) VALUES
-- Apex Care Pharmacy (Pharmacy 1)
(1, 1, 120, 32.50, '2027-08-30', 'Available'),
(1, 2, 45, 95.00, '2026-12-31', 'Available'),
(1, 3, 6, 22.00, '2026-10-15', 'Low Stock'),
(1, 4, 80, 48.00, '2027-05-20', 'Available'),
(1, 5, 0, 110.00, '2026-09-01', 'Out of Stock'),
(1, 6, 50, 65.00, '2027-11-15', 'Available'),

-- City Meds 24x7 (Pharmacy 2)
(2, 1, 250, 31.00, '2027-09-15', 'Available'),
(2, 3, 90, 20.00, '2027-03-31', 'Available'),
(2, 5, 40, 105.00, '2027-04-10', 'Available'),
(2, 7, 30, 125.00, '2026-11-30', 'Available'),
(2, 8, 4, 88.00, '2026-08-15', 'Low Stock'),
(2, 11, 15, 145.00, '2027-01-20', 'Available'),

-- Wellness First Chemist (Pharmacy 3)
(3, 1, 8, 33.00, '2026-12-01', 'Low Stock'),
(3, 2, 0, 98.00, '2026-07-20', 'Out of Stock'),
(3, 4, 60, 49.00, '2027-06-30', 'Available'),
(3, 9, 35, 75.00, '2027-02-28', 'Available'),
(3, 10, 85, 28.00, '2027-10-10', 'Available'),
(3, 12, 40, 55.00, '2027-12-31', 'Available'),

-- LifeLine Healthcare & Druggists (Pharmacy 4)
(4, 2, 25, 92.00, '2027-01-15', 'Available'),
(4, 4, 5, 47.00, '2026-10-30', 'Low Stock'),
(4, 6, 70, 62.00, '2027-08-15', 'Available'),
(4, 7, 0, 128.00, '2026-09-10', 'Out of Stock'),
(4, 8, 55, 86.00, '2027-03-25', 'Available'),
(4, 12, 60, 52.00, '2028-02-15', 'Available'),

-- MedPlus Community Chemist (Pharmacy 5)
(5, 1, 95, 30.50, '2027-07-15', 'Available'),
(5, 3, 40, 21.00, '2027-05-10', 'Available'),
(5, 5, 50, 108.00, '2027-06-20', 'Available'),
(5, 9, 2, 74.00, '2026-11-05', 'Low Stock'),
(5, 10, 65, 27.50, '2027-09-10', 'Available'),
(5, 11, 0, 149.00, '2026-08-30', 'Out of Stock');

-- Seed Sample Reservations
INSERT INTO `reservations` (`id`, `user_id`, `pharmacy_id`, `medicine_id`, `quantity`, `status`, `notes`) VALUES
(1, 1, 1, 1, 2, 'Accepted', 'Urgent pickup this evening around 6 PM'),
(2, 1, 2, 3, 1, 'Pending', 'Please hold until 8 PM'),
(3, 1, 3, 10, 1, 'Completed', 'Picked up by family member');

-- Seed Favorites
INSERT INTO `favorites` (`id`, `user_id`, `medicine_id`, `pharmacy_id`) VALUES
(1, 1, 1, NULL),
(2, 1, 4, NULL),
(3, 1, NULL, 1),
(4, 1, NULL, 2);

-- Seed Search History
INSERT INTO `search_history` (`id`, `user_id`, `search_query`) VALUES
(1, 1, 'Paracetamol'),
(2, 1, 'Dolo 650'),
(3, 1, 'Metformin'),
(4, 1, 'Cetirizine');

