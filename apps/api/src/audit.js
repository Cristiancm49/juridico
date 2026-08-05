export async function writeAudit(client, request, event) {
  await client.query(
    `INSERT INTO audit_logs
      (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
    [
      event.userId || request.user?.id || null,
      event.action,
      event.entityType || null,
      event.entityId || null,
      JSON.stringify(event.details || {}),
      request.ip,
      request.headers['user-agent'] || null,
    ],
  );
}
