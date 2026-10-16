# Restore from backup

Owner: Ridwan (draft), reviewed by Zacki.

1. Declare an incident; tell the Product Owner delegate.
2. Provision a clean server or empty database.
3. Run infra/backup/restore.sh with the latest good backup.
4. Run acceptance checks.
5. Log the result (date, time taken, data lost).
