## Project - Simcha Billing

# Color code theme : 

COLOUR PALETTE #043486 #0248BC

For background : use #FFFFFF

For normal text color : use #292424ff




# TYPOGRAPHY:

 Poppins (OTF) SemiBold / Regular  

-- 1. Foreign Key checks-ah temporarily disable panradhu
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Outward Invoices & Items clear panradhu
TRUNCATE TABLE bill_items;
TRUNCATE TABLE bills;

-- 3. Inward Purchases & Items clear panradhu
TRUNCATE TABLE inward_bill_items;
TRUNCATE TABLE inward_bills;

-- 4. Quotations & Items clear panradhu
TRUNCATE TABLE quotation_items;
TRUNCATE TABLE quotations;

-- 5. Service Bills / Estimates & Items clear panradhu
TRUNCATE TABLE service_bill_items;
TRUNCATE TABLE service_bills;

-- 6. Returns & QC Registry clear panradhu
TRUNCATE TABLE returns_registry;

-- 7. Inventory Serials & Stock Movements clear panradhu
TRUNCATE TABLE inventory_serials;
TRUNCATE TABLE stock_ledger;

-- 8. Password OTP & Reset Tokens clear panradhu
TRUNCATE TABLE password_otps;
TRUNCATE TABLE password_reset_tokens;

-- 9. (Optional) Test Materials stock reset or clear:
-- A) Materials irukatum, stock mattum 0 aaganum na:
UPDATE materials SET current_stock = 0;

-- B) All Test Materials-aiyum delete pannanum na:
-- TRUNCATE TABLE materials;
-- TRUNCATE TABLE categories;

-- 10. Foreign Key checks-ah thirumba enable panradhu
SET FOREIGN_KEY_CHECKS = 1;
 