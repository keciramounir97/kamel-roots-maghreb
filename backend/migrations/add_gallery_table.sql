-- Gallery table migration
-- Run this SQL in your MySQL database

CREATE TABLE IF NOT EXISTS `gallery` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `image_path` VARCHAR(500) NOT NULL,
  `uploaded_by` INT NULL,
  `is_public` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `gallery_uploaded_by_idx` (`uploaded_by`),
  CONSTRAINT `gallery_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
