import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { config } from './config.js';

const client = new S3Client({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
  forcePathStyle: config.s3.forcePathStyle,
});

let bucketPromise;

export async function ensureDocumentBucket() {
  if (!bucketPromise) {
    bucketPromise = (async () => {
      try {
        await client.send(new HeadBucketCommand({ Bucket: config.s3.bucket }));
      } catch (error) {
        if (![404, 400].includes(error.$metadata?.httpStatusCode) && error.name !== 'NotFound') throw error;
        try {
          await client.send(new CreateBucketCommand({ Bucket: config.s3.bucket }));
        } catch (createError) {
          if (createError.name !== 'BucketAlreadyOwnedByYou') throw createError;
        }
      }
    })().catch((error) => {
      bucketPromise = null;
      throw error;
    });
  }
  return bucketPromise;
}

export async function putDocument({ key, body, contentType, sha256 }) {
  await ensureDocumentBucket();
  await client.send(new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: { sha256 },
  }));
}

export async function getDocument(key) {
  await ensureDocumentBucket();
  return client.send(new GetObjectCommand({ Bucket: config.s3.bucket, Key: key }));
}

export async function deleteDocument(key) {
  await ensureDocumentBucket();
  await client.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key }));
}
