SELECT u.email, u.id as user_id, m.role, m."tenantId", t.name as tenant_name
FROM "User" u
LEFT JOIN "Membership" m ON u.id = m."userId"
LEFT JOIN "Tenant" t ON m."tenantId" = t.id
WHERE u.email = 'fmonfasani@gmail.com';
