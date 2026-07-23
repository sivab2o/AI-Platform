-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 18, 2026 at 01:01 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ai_employee`
--

-- --------------------------------------------------------

--
-- Table structure for table `ai_training`
--

CREATE TABLE `ai_training` (
  `id` int(11) NOT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `training_data` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `master_data` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ai_training`
--

INSERT INTO `ai_training` (`id`, `user_id`, `name`, `email`, `mobile`, `training_data`, `created_at`, `master_data`) VALUES
(1, 'LF1', 'Elango', 'lic.elango@gmail.com', '9790546154', 'AI Employee Name: Sarah\nAI Employee Gender: Female\nHow should the AI address customers?: Friend\nAI Introduction Script: Hi! How can I grow your business today?\nCan AI suggest starting tips to customers?: Yes\nCommunication Style: Professional\nHow should AI reply?: Medium\nCan AI speak about topics not related to business?: Yes\nBusiness Name: Growth Digital Solutions\nBusiness Category: Digital Marketing\nBusiness Description: We help businesses generate more leads through Google Ads, Meta Ads, SEO, WhatsApp Marketing, Social Media Marketing, AI Automation, and Website Development.\n\nProduct or Service 1: Google Ads\nProduct or Service 2: Meta Ads\nProduct or Service 3: Website Development\nProduct or Service 4: WhatsApp Marketing\n\nBusiness Location / Service Area: Chennai\nBusiness WhatsApp Number: 9876501234\nWorking Days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday\nOffice Opening Time: 09:00\nOffice Closing Time: 18:00\nMaximum time AI can talk/chat to one customer: 15 Minutes\nMaximum messages before transfer to human: No Limit\nShould AI collect customer contact details?: Yes\nShould AI collect customer location?: Yes\nShould AI qualify leads before transfer?: Yes\nCan AI schedule appointments?: Yes\nCan AI ask customer budget range?: Yes\nCan AI ask customer urgency/timeline?: Yes\nNeed responsible person mobile number?: Yes\nResponsible Person Name: David\nResponsible Person Mobile Number: 9876501234\nTransfer customer to human when: Customer ready to buy, Customer wants proposal, Customer asks technical question, Customer requests callback, Payment issue\nEnd Conversation Style: Thanks for Contacting Us\nCan AI share pricing?: Yes\nCan AI share offers/discounts?: Yes\nCan AI share owner contact details?: Yes\nCan AI call customer by name repeatedly?: Yes\nCan AI follow up automatically?: Yes\nFollow-up Frequency: Daily', '2026-06-16 01:56:19', '<p><strong>--- From: Digital Marketing FAQ.pdf ---</strong></p>\n\n<p><strong>Q1: What digital marketing services do you offer?</strong></p>\n<p>A: We provide Google Ads, Meta Ads (Facebook & Instagram), SEO, Social Media Marketing, WhatsApp Marketing, AI Automation, Website Development, Lead Generation, Branding, and Content Creation.</p>\n\n<p><strong>Q2: Which businesses do you work with?</strong></p>\n<p>A: We work with startups, local businesses, retailers, manufacturers, educational institutions, healthcare providers, real estate companies, restaurants, and service-based businesses.</p>\n\n<p><strong>Q3: Do you create websites?</strong></p>\n<p>A: Yes. We design responsive business websites, landing pages, e-commerce websites, portfolio websites, and custom web applications.</p>\n\n<p><strong>Q4: Do you provide WhatsApp Marketing?</strong></p>\n<p>A: Yes. We provide WhatsApp Business setup, Click-to-WhatsApp Ads, WhatsApp CRM integration, broadcast campaigns, chatbot automation, and follow-up automation.</p>\n\n<p><strong>Q5: Do you manage Google Ads?</strong></p>\n<p>A: Yes. We create, optimize, and manage Google Search, Display, YouTube, and Performance Max campaigns focused on lead generation and ROI.</p>\n\n<p><strong>Q6: Do you manage Facebook and Instagram Ads?</strong></p>\n<p>A: Yes. We create Meta advertising campaigns for lead generation, brand awareness, website traffic, WhatsApp messages, and conversions.</p>\n\n<p><strong>Q7: Do you provide SEO services?</strong></p>\n<p>A: Yes. We offer on-page SEO, technical SEO, local SEO, Google Business Profile optimization, keyword research, and content optimization.</p>\n\n<p><strong>Q8: Can you generate leads for my business?</strong></p>\n<p>A: Yes. Our strategies focus on generating qualified leads through Google Ads, Meta Ads, landing pages, WhatsApp funnels, and marketing automation.</p>\n\n<p><strong>Q9: Do you offer AI Automation?</strong></p>\n<p>A: Yes. We build AI chatbots, AI employees, WhatsApp AI assistants, CRM automation, lead qualification, and customer support automation.</p>\n\n<p><strong>Q10: How long does it take to see results?</strong></p>\n<p>A: Paid advertising can generate results within days, while SEO and organic marketing generally require several months depending on competition and goals.</p>\n\n<p><strong>Q11: Do you provide monthly support?</strong></p>\n<p>A: Yes. We provide campaign monitoring, optimization, reporting, consultation, and ongoing digital marketing support.</p>\n\n<p><strong>Q12: Do you offer free consultation?</strong></p>\n<p>A: Yes. We offer an initial consultation to understand your business, goals, and recommend the most suitable marketing strategy.</p>\n\n<p><strong>Q13: Do you work with businesses outside Chennai?</strong></p>\n<p>A: Yes. We serve clients across India and internationally through online meetings and remote support.</p>\n\n<p><strong>Q14: Can you integrate CRM and automation?</strong></p>\n<p>A: Yes. We integrate CRM systems, WhatsApp automation, lead management, email automation, and AI-powered customer engagement solutions.</p>\n\n<p><strong>Q15: How do I get started?</strong></p>\n<p>A: Simply contact us through WhatsApp or book a free consultation. We\'ll understand your business, discuss your goals, and recommend the best digital marketing strategy.</p>');

-- --------------------------------------------------------

--
-- Table structure for table `conversations`
--

CREATE TABLE `conversations` (
  `id` int(11) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `message` longtext DEFAULT NULL,
  `reply` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `whatsapp_number` varchar(20) DEFAULT NULL,
  `source` varchar(20) DEFAULT 'chat'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `guests`
--

CREATE TABLE `guests` (
  `id` int(11) NOT NULL,
  `owner_id` varchar(20) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `summary` longtext DEFAULT NULL,
  `interest_score` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `guest_conversations`
--

CREATE TABLE `guest_conversations` (
  `id` int(11) NOT NULL,
  `owner_id` varchar(20) NOT NULL,
  `guest_id` int(11) NOT NULL,
  `guest_name` varchar(255) DEFAULT NULL,
  `message` longtext DEFAULT NULL,
  `reply` longtext DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `training_questions`
--

CREATE TABLE `training_questions` (
  `id` int(11) NOT NULL,
  `owner_id` varchar(50) NOT NULL,
  `question` text NOT NULL,
  `question_type` enum('multiple','fill') DEFAULT 'multiple',
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`)),
  `has_others` tinyint(1) DEFAULT 1,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `translations`
--

CREATE TABLE `translations` (
  `id` int(11) NOT NULL,
  `lang` varchar(10) NOT NULL,
  `original_text` text NOT NULL,
  `translated_text` longtext NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `mobile` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `lang` varchar(10) DEFAULT 'en'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ai_training`
--
ALTER TABLE `ai_training`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_ai_training_user_id` (`user_id`);

--
-- Indexes for table `conversations`
--
ALTER TABLE `conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `guests`
--
ALTER TABLE `guests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_owner` (`owner_id`),
  ADD KEY `idx_mobile` (`mobile`);

--
-- Indexes for table `guest_conversations`
--
ALTER TABLE `guest_conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_owner_guest` (`owner_id`,`guest_id`);

--
-- Indexes for table `training_questions`
--
ALTER TABLE `training_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_owner` (`owner_id`);

--
-- Indexes for table `translations`
--
ALTER TABLE `translations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_translation` (`lang`,`original_text`(255));

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_user_id` (`user_id`),
  ADD UNIQUE KEY `uk_email` (`email`),
  ADD KEY `idx_mobile` (`mobile`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ai_training`
--
ALTER TABLE `ai_training`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `conversations`
--
ALTER TABLE `conversations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `guests`
--
ALTER TABLE `guests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `guest_conversations`
--
ALTER TABLE `guest_conversations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `training_questions`
--
ALTER TABLE `training_questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `translations`
--
ALTER TABLE `translations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
