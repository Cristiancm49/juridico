import crypto from 'node:crypto';
import path from 'node:path';
import { authenticate, requirePermission } from '../auth.js';
import { writeAudit } from '../audit.js';
import { config } from '../config.js';
import { query, withTransaction } from '../db.js';
import { deleteDocument, getDocument, putDocument } from '../storage.js';

const allowedFiles = {
  pdf: { mime: 'application/pdf', signature: (buffer) => buffer.subarray(0, 5).toString() === '%PDF-' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', signature: isZip },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', signature: isZip },
  jpg: { mime: 'image/jpeg', signature: isJpeg },
  jpeg: { mime: 'image/jpeg', signature: isJpeg },
  png: { mime: 'image/png', signature: isPng },
};

const selectDocument = `
  SELECT
    d.id,
    d.document_group_id AS "documentGroupId",
    d.version_number AS "versionNumber",
    d.is_current AS "isCurrent",
    d.original_name AS "originalName",
    d.mime_type AS "mimeType",
    d.extension,
    d.size_bytes::int AS "sizeBytes",
    d.sha256,
    d.description,
    d.created_at AS "createdAt",
    json_build_object('id', dc.id, 'code', dc.code, 'name', dc.name) AS category,
    CASE WHEN u.id IS NULL THEN NULL ELSE json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email) END AS uploader
  FROM documents d
  JOIN document_categories dc ON dc.id = d.category_id
  LEFT JOIN users u ON u.id = d.uploaded_by`;

function isZip(buffer) {
  return buffer.length >= 4
    && buffer[0] === 0x50
    && buffer[1] === 0x4b
    && buffer[2] === 0x03
    && buffer[3] === 0x04;
}

function isJpeg(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isPng(buffer) {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function expectedError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function cleanFilename(value) {
  const base = path.basename(value || 'documento').normalize('NFKC');
  return base.replace(/[^\p{L}\p{N}._() -]/gu, '_').replace(/\s+/g, ' ').slice(0, 180) || 'documento';
}

function cleanField(field, maximum, label, required = false) {
  const value = typeof field?.value === 'string' ? field.value.trim() : '';
  if (required && !value) throw expectedError(`${label} es obligatorio.`);
  if (value.length > maximum) throw expectedError(`${label} supera la longitud permitida.`);
  return value || null;
}

function requireUuid(value, label) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')) {
    throw expectedError(`${label} no es válido.`);
  }
  return value;
}

function validateFile(file, buffer) {
  if (!buffer.length) throw expectedError('El archivo está vacío.');
  const filename = cleanFilename(file.filename);
  const extension = path.extname(filename).slice(1).toLowerCase();
  const rule = allowedFiles[extension];
  if (!rule || rule.mime !== file.mimetype || !rule.signature(buffer)) {
    throw expectedError('El archivo no coincide con un formato permitido: PDF, DOCX, XLSX, JPG o PNG.');
  }
  return { filename, extension };
}

function contentDisposition(filename) {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

async function ensureCase(client, caseId, lock = false) {
  const result = await client.query(
    `SELECT cs.code AS "statusCode"
     FROM cases c
     JOIN case_statuses cs ON cs.id = c.status_id
     WHERE c.id = $1${lock ? ' FOR UPDATE OF c' : ''}`,
    [caseId],
  );
  if (result.rowCount === 0) throw expectedError('Expediente no encontrado.', 404);
  return result.rows[0];
}

export async function documentRoutes(app) {
  app.get(
    '/:caseId/documents',
    {
      preHandler: [authenticate, requirePermission('documents.read')],
      schema: {
        params: { type: 'object', required: ['caseId'], properties: { caseId: { type: 'string', format: 'uuid' } } },
      },
    },
    async (request) => {
      await ensureCase({ query }, request.params.caseId);
      const result = await query(
        `${selectDocument}
         WHERE d.case_id = $1
         ORDER BY d.created_at DESC, d.version_number DESC
         LIMIT 200`,
        [request.params.caseId],
      );
      return { documents: result.rows, maxBytes: config.documentMaxBytes };
    },
  );

  app.post(
    '/:caseId/documents',
    {
      preHandler: [authenticate, requirePermission('documents.write')],
      schema: {
        consumes: ['multipart/form-data'],
        params: { type: 'object', required: ['caseId'], properties: { caseId: { type: 'string', format: 'uuid' } } },
      },
    },
    async (request, reply) => {
      const file = await request.file({ limits: { files: 1, fileSize: config.documentMaxBytes, fields: 3, parts: 4 } });
      if (!file) throw expectedError('Selecciona un archivo.');
      const buffer = await file.toBuffer();
      const { filename, extension } = validateFile(file, buffer);
      const categoryId = requireUuid(cleanField(file.fields.categoryId, 50, 'La categoría', true), 'La categoría');
      const description = cleanField(file.fields.description, 1000, 'La descripción');
      const replacesDocumentId = cleanField(file.fields.replacesDocumentId, 50, 'El documento reemplazado');
      if (replacesDocumentId) requireUuid(replacesDocumentId, 'El documento reemplazado');
      const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      const id = crypto.randomUUID();
      const storageKey = `cases/${request.params.caseId}/${id}.${extension}`;
      const [caseCheck, categoryCheck] = await Promise.all([
        query(
          `SELECT cs.code AS "statusCode" FROM cases c JOIN case_statuses cs ON cs.id = c.status_id WHERE c.id = $1`,
          [request.params.caseId],
        ),
        query('SELECT id FROM document_categories WHERE id = $1 AND active = TRUE', [categoryId]),
      ]);
      if (caseCheck.rowCount === 0) throw expectedError('Expediente no encontrado.', 404);
      if (caseCheck.rows[0].statusCode === 'archived') throw expectedError('No se pueden cargar documentos en un expediente archivado.');
      if (categoryCheck.rowCount === 0) throw expectedError('La categoría no existe o está inactiva.');
      await putDocument({ key: storageKey, body: buffer, contentType: file.mimetype, sha256 });

      try {
        await withTransaction(async (client) => {
          const caseData = await ensureCase(client, request.params.caseId, true);
          if (caseData.statusCode === 'archived') throw expectedError('No se pueden cargar documentos en un expediente archivado.');
          const categoryResult = await client.query('SELECT id FROM document_categories WHERE id = $1 AND active = TRUE', [categoryId]);
          if (categoryResult.rowCount === 0) throw expectedError('La categoría no existe o está inactiva.');

          let groupId = crypto.randomUUID();
          let versionNumber = 1;
          if (replacesDocumentId) {
            const previousResult = await client.query(
              `SELECT document_group_id AS "groupId", version_number AS "versionNumber", sha256, is_current AS "isCurrent"
               FROM documents
               WHERE id = $1 AND case_id = $2
               FOR UPDATE`,
              [replacesDocumentId, request.params.caseId],
            );
            if (previousResult.rowCount === 0) throw expectedError('El documento que deseas versionar no existe.', 404);
            const previous = previousResult.rows[0];
            if (!previous.isCurrent) throw expectedError('Solo se puede crear una versión desde el documento vigente.', 409);
            if (previous.sha256 === sha256) throw expectedError('La nueva versión es idéntica al documento vigente.', 409);
            groupId = previous.groupId;
            versionNumber = previous.versionNumber + 1;
            await client.query('UPDATE documents SET is_current = FALSE WHERE id = $1', [replacesDocumentId]);
          }

          await client.query(
            `INSERT INTO documents
              (id, case_id, category_id, document_group_id, version_number, original_name, storage_key,
               mime_type, extension, size_bytes, sha256, description, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [id, request.params.caseId, categoryId, groupId, versionNumber, filename, storageKey,
              file.mimetype, extension, buffer.length, sha256, description, request.user.id],
          );
          await writeAudit(client, request, {
            action: 'document.upload',
            entityType: 'document',
            entityId: id,
            details: { caseId: request.params.caseId, versionNumber, replacesDocumentId, sha256 },
          });
        });
      } catch (error) {
        await deleteDocument(storageKey).catch(() => {});
        throw error;
      }

      const result = await query(`${selectDocument} WHERE d.id = $1`, [id]);
      return reply.code(201).send({ document: result.rows[0] });
    },
  );

  app.get(
    '/:caseId/documents/:documentId/download',
    {
      preHandler: [authenticate, requirePermission('documents.read')],
      schema: {
        params: {
          type: 'object',
          required: ['caseId', 'documentId'],
          properties: {
            caseId: { type: 'string', format: 'uuid' },
            documentId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await query(
        `SELECT id, original_name AS "originalName", storage_key AS "storageKey", mime_type AS "mimeType", size_bytes::int AS "sizeBytes"
         FROM documents WHERE id = $1 AND case_id = $2`,
        [request.params.documentId, request.params.caseId],
      );
      if (result.rowCount === 0) return reply.code(404).send({ message: 'Documento no encontrado.' });
      const document = result.rows[0];
      const object = await getDocument(document.storageKey);
      await withTransaction((client) => writeAudit(client, request, {
        action: 'document.download',
        entityType: 'document',
        entityId: document.id,
        details: { caseId: request.params.caseId },
      }));
      reply
        .header('Content-Type', document.mimeType)
        .header('Content-Length', object.ContentLength ?? document.sizeBytes)
        .header('Content-Disposition', contentDisposition(document.originalName))
        .header('Cache-Control', 'private, no-store')
        .header('X-Content-Type-Options', 'nosniff');
      return reply.send(object.Body);
    },
  );
}
