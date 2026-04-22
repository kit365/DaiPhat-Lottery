-- Fix: Mark existing initial accounts as setup complete (has_password and agreed_to_terms)
-- This ensures that existing admin, user, shipper, and manager accounts bypass the setup profile flow.
-- Run-once migration.

UPDATE users 
SET has_password = TRUE, 
    agreed_to_terms = TRUE 
WHERE username IN ('admin', 'user', 'shipper', 'manager')
AND (has_password = FALSE OR agreed_to_terms = FALSE);
