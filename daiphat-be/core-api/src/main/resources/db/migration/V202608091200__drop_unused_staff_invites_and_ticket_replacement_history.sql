-- These tables have no entity, repository, service, API, or client references.
-- Do not use CASCADE: the migration must fail if a future migration introduces
-- a dependency that has not been reviewed.
DROP TABLE IF EXISTS ticket_replacement_history;
DROP TABLE IF EXISTS staff_invites;
