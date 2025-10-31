import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import createAuthRouter from './routes/auth.js';
import fs from 'fs';
import { verifyToken, requireDBA, requireAdmin } from './middleware/auth.js';
import { upload, parseNestedFields } from './middleware/upload.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Global request logger for debugging
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path.includes('/api/events')) {
    process.stdout.write(`\n>>> ${req.method} ${req.path} - Headers: ${JSON.stringify(req.headers['content-type'])}\n`);
    
    // Intercept response to see what's being sent
    const originalJson = res.json;
    res.json = function(data) {
      process.stdout.write(`>>> RESPONSE SENT: ${JSON.stringify(data)}\n`);
      return originalJson.call(this, data);
    };
  }
  next();
});

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://gogtekulam:gogtekul@cluster0.t3c0jt6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const dbName = process.env.MONGODB_DB || 'test';
const collectionName = 'members';
const newsCollectionName = 'news';
const eventsCollectionName = 'events';
const sheetsCollectionName = 'members';

let client;
let db;

const stringOrEmpty = (value) => (value === undefined || value === null ? '' : String(value));
const trimmedStringOrEmpty = (value) => stringOrEmpty(value).trim();
const toBoolean = (value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return Boolean(value);
};
const toISOStringOrNull = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};
const ensureNewsTags = (value) => {
  if (Array.isArray(value)) {
    return value.map((tag) => trimmedStringOrEmpty(tag)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((tag) => trimmedStringOrEmpty(tag)).filter(Boolean);
  }
  return [];
};
const ensureVisibleVanshNumbers = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => trimmedStringOrEmpty(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => trimmedStringOrEmpty(item)).filter(Boolean);
  }
  return [];
};
const resolveNewsPriority = (value) => {
  const normalized = trimmedStringOrEmpty(value).toLowerCase();
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized;
  }
  return 'low';
};
const extractNewsImages = (source) => {
  const candidate = source && typeof source === 'object' ? source : {};
  return {
    url: trimmedStringOrEmpty(candidate.url || candidate.imageUrl),
    thumbnail: trimmedStringOrEmpty(candidate.thumbnail || candidate.imageThumbnail),
    caption: trimmedStringOrEmpty(candidate.caption || candidate.imageCaption),
  };
};
const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    const num = Number(value);
    if (!Number.isNaN(num)) {
      const fromNumber = new Date(num);
      if (!Number.isNaN(fromNumber.getTime())) {
        return fromNumber;
      }
    }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const direct = new Date(trimmed);
    if (!Number.isNaN(direct.getTime())) {
      return direct;
    }
    const normalized = trimmed.replace(/[,]/g, '');
    const parts = normalized.split(/[\/\.\-]/).map((part) => part.trim()).filter(Boolean);
    if (parts.length === 3) {
      const numbers = parts.map((part) => Number(part));
      if (numbers.every((num) => !Number.isNaN(num))) {
        let year;
        let month;
        let day;
        if (parts[0].length === 4) {
          year = numbers[0];
          month = numbers[1];
          day = numbers[2];
        } else if (parts[2].length === 4) {
          year = numbers[2];
          if (numbers[0] > 12 && numbers[1] <= 12) {
            day = numbers[0];
            month = numbers[1];
          } else if (numbers[1] > 12 && numbers[0] <= 12) {
            month = numbers[0];
            day = numbers[1];
          } else {
            day = numbers[0];
            month = numbers[1];
          }
        } else {
          year = numbers[2] + 2000;
          month = numbers[0];
          day = numbers[1];
        }
        if (typeof year === 'number' && typeof month === 'number' && typeof day === 'number') {
          const constructed = new Date(year, month - 1, day);
          if (!Number.isNaN(constructed.getTime())) {
            return constructed;
          }
        }
      }
    }
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const pickFirstDefined = (candidates) => {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    if (candidate instanceof Date) {
      if (!Number.isNaN(candidate.getTime())) return candidate;
      continue;
    }
    const asString = String(candidate).trim();
    if (asString) {
      return candidate;
    }
  }
  return null;
};

const composeMemberName = (member) => {
  const personal = member.personalDetails || {};
  const parts = [
    personal.firstName ?? member.firstName,
    personal.middleName ?? member.middleName,
    personal.lastName ?? member.lastName
  ]
    .map((part) => trimmedStringOrEmpty(part))
    .filter(Boolean);
  const fallback = trimmedStringOrEmpty(member.name);
  const name = parts.join(' ').trim();
  if (name) return name;
  if (fallback) return fallback;
  const serNo = member.serNo !== undefined && member.serNo !== null ? `Member ${member.serNo}` : '';
  return serNo || 'Family Member';
};

const ensureEventPriority = (value) => {
  const normalized = trimmedStringOrEmpty(value).toLowerCase();
  if (normalized === 'high') return 'High';
  if (normalized === 'low') return 'Low';
  if (normalized === 'medium') return 'Medium';
  return 'Medium';
};

const resolveMemberNameBySerNo = async (database, serNo) => {
  if (serNo === undefined || serNo === null) {
    return null;
  }
  const collection = database.collection(collectionName);
  const variants = new Set();
  const numericValue = Number(serNo);
  if (!Number.isNaN(numericValue)) {
    variants.add(numericValue);
  }
  variants.add(String(serNo));
  const member = await collection.findOne({ serNo: { $in: Array.from(variants) } });
  if (!member) {
    return null;
  }
  return composeMemberName(member);
};

const attachCreatorNamesToEvents = async (database, documents) => {
  if (!Array.isArray(documents) || documents.length === 0) {
    return documents;
  }
  const missingSerNos = new Set();
  documents.forEach((doc) => {
    if (!doc) return;
    const name = trimmedStringOrEmpty(doc.createdByName);
    if (name) return;
    if (doc.createdBySerNo === undefined || doc.createdBySerNo === null) return;
    missingSerNos.add(doc.createdBySerNo);
  });
  if (missingSerNos.size === 0) {
    return documents;
  }
  const searchValues = new Set();
  missingSerNos.forEach((value) => {
    if (value === undefined || value === null) return;
    searchValues.add(value);
    searchValues.add(String(value));
  });
  const collection = database.collection(collectionName);
  const members = await collection
    .find({ serNo: { $in: Array.from(searchValues) } })
    .toArray();
  const nameMap = new Map();
  members.forEach((member) => {
    if (!member) return;
    const name = composeMemberName(member);
    if (!name) return;
    nameMap.set(String(member.serNo), name);
    if (member.serNo !== undefined && member.serNo !== null) {
      nameMap.set(member.serNo, name);
    }
  });
  documents.forEach((doc) => {
    if (!doc) return;
    const name = trimmedStringOrEmpty(doc.createdByName);
    if (name) return;
    const lookup = nameMap.get(doc.createdBySerNo) || nameMap.get(String(doc.createdBySerNo));
    if (lookup) {
      doc.createdByName = lookup;
    }
  });
  return documents;
};

const resolveEventImage = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === 'object') {
    if (typeof value.dataUrl === 'string' && value.dataUrl.trim()) {
      return value.dataUrl.trim();
    }
    const urlCandidate = trimmedStringOrEmpty(value.url || value.imageUrl);
    if (urlCandidate) {
      return urlCandidate;
    }
    if (typeof value.data === 'string' && value.data) {
      const type = trimmedStringOrEmpty(value.mimetype) || 'image/png';
      return `data:${type};base64,${value.data}`;
    }
  }
  return null;
};

const normalizeEventDocument = (doc) => {
  if (!doc) return null;
  const eventName = trimmedStringOrEmpty(doc.eventName) || trimmedStringOrEmpty(doc.title);
  const primaryDate = doc.date || doc.fromDate;
  const primaryTime = doc.time || doc.fromTime;
  return {
    id: doc._id ? String(doc._id) : null,
    eventName,
    eventType: trimmedStringOrEmpty(doc.eventType),
    date: toISOStringOrNull(primaryDate),
    time: trimmedStringOrEmpty(primaryTime),
    fromDate: toISOStringOrNull(doc.fromDate || doc.date),
    toDate: toISOStringOrNull(doc.toDate),
    fromTime: trimmedStringOrEmpty(doc.fromTime || doc.time),
    toTime: trimmedStringOrEmpty(doc.toTime),
    priority: ensureEventPriority(doc.priority),
    eventImage: resolveEventImage(doc.eventImage || doc.image || doc.imageUrl || doc.eventImageUrl),
    createdBy: doc.createdBy ? String(doc.createdBy) : null,
    createdBySerNo: doc.createdBySerNo ?? null,
    createdByName: stringOrEmpty(doc.createdByName),
    description: stringOrEmpty(doc.description),
    isAutoGenerated: toBoolean(doc.isAutoGenerated),
    venue: trimmedStringOrEmpty(doc.venue),
    venueStreet: trimmedStringOrEmpty(doc.venueStreet),
    city: trimmedStringOrEmpty(doc.city),
    state: trimmedStringOrEmpty(doc.state),
    pincode: trimmedStringOrEmpty(doc.pincode),
    country: trimmedStringOrEmpty(doc.country),
    address: stringOrEmpty(doc.address),
    visibleToAllVansh: toBoolean(doc.visibleToAllVansh),
    visibleVanshNumbers: ensureVisibleVanshNumbers(doc.visibleVanshNumbers),
    createdAt: toISOStringOrNull(doc.createdAt),
    updatedAt: toISOStringOrNull(doc.updatedAt),
  };
};

const buildEventPayload = (body, user = {}, existing = {}) => {
  const input = body && typeof body === 'object' ? body : {};
  const now = new Date();
  const createdAt = parseDateValue(existing.createdAt) || now;
  const eventDate = parseDateValue(input.date) || parseDateValue(existing.date);
  const visibilityOption = trimmedStringOrEmpty(input.visibilityOption || existing.visibilityOption);
  let visibleToAllVansh = toBoolean(
    input.visibleToAllVansh !== undefined ? input.visibleToAllVansh : existing.visibleToAllVansh
  );
  if (visibilityOption) {
    visibleToAllVansh = visibilityOption === 'all';
  }
  let vanshSource = input.visibleVanshNumbers !== undefined ? input.visibleVanshNumbers : input.vansh;
  if (vanshSource === undefined) {
    vanshSource = existing.visibleVanshNumbers !== undefined ? existing.visibleVanshNumbers : existing.vansh;
  }
  const visibleVanshNumbers = visibleToAllVansh ? [] : ensureVisibleVanshNumbers(vanshSource);

  return {
    eventName: trimmedStringOrEmpty(input.eventName || existing.eventName),
    eventType: trimmedStringOrEmpty(input.eventType || existing.eventType),
    date: eventDate,
    time: trimmedStringOrEmpty(input.time || existing.time),
    priority: ensureEventPriority(input.priority || existing.priority),
    description: stringOrEmpty(input.description || existing.description),
    isAutoGenerated: toBoolean(
      input.isAutoGenerated !== undefined ? input.isAutoGenerated : existing.isAutoGenerated
    ),
    venue: trimmedStringOrEmpty(input.venue || existing.venue),
    address: stringOrEmpty(input.address || existing.address),
    visibleToAllVansh,
    visibleVanshNumbers,
    createdBy: existing.createdBy ?? (user?.sub ?? null),
    createdBySerNo: existing.createdBySerNo ?? (user?.serNo ?? null),
    createdByName: trimmedStringOrEmpty(existing.createdByName) || null,
    createdAt,
    updatedAt: now,
  };
};

const normalizeNewsDocument = (doc) => {
  if (!doc) return null;
  const images = extractNewsImages(doc.images || doc);
  return {
    id: doc._id ? String(doc._id) : null,
    title: trimmedStringOrEmpty(doc.title),
    summary: trimmedStringOrEmpty(doc.summary),
    content: stringOrEmpty(doc.content),
    author: doc.author ? String(doc.author) : null,
    authorName: trimmedStringOrEmpty(doc.authorName),
    category: trimmedStringOrEmpty(doc.category),
    images,
    publishDate: toISOStringOrNull(doc.publishDate),
    priority: resolveNewsPriority(doc.priority),
    tags: ensureNewsTags(doc.tags),
    visibleVanshNumbers: ensureVisibleVanshNumbers(doc.visibleVanshNumbers || doc.visibleVansh),
    visibleToAllVansh: toBoolean(doc.visibleToAllVansh),
    createdAt: toISOStringOrNull(doc.createdAt),
    updatedAt: toISOStringOrNull(doc.updatedAt),
  };
};
const parseAuthorObjectId = (value) => {
  const str = trimmedStringOrEmpty(value);
  if (!str) return null;
  if (!ObjectId.isValid(str)) return null;
  return new ObjectId(str);
};
const buildNewsImagesPayload = (body) => {
  const source = body && typeof body === 'object' ? body : {};
  const imagesSource = source.images && typeof source.images === 'object' ? source.images : {};
  const url = trimmedStringOrEmpty(imagesSource.url || source.imageUrl);
  const thumbnail = trimmedStringOrEmpty(imagesSource.thumbnail || source.imageThumbnail);
  const caption = trimmedStringOrEmpty(imagesSource.caption || source.imageCaption);
  return {
    url,
    thumbnail,
    caption,
  };
};
const buildNewsPayload = (body, user, existing = {}) => {
  const input = body && typeof body === 'object' ? body : {};
  const now = new Date();
  const createdAt = parseDateValue(existing.createdAt) || now;
  const publishDate = parseDateValue(input.publishDate) || parseDateValue(existing.publishDate);
  const tags = ensureNewsTags(input.tags !== undefined ? input.tags : existing.tags);
  const images = buildNewsImagesPayload(input);
  const priority = resolveNewsPriority(input.priority || existing.priority);
  const visibleToAllSource = input.visibleToAllVansh !== undefined ? input.visibleToAllVansh : existing.visibleToAllVansh;
  const visibleToAllVansh = toBoolean(visibleToAllSource);
  const visibleVanshSource = input.visibleVanshNumbers !== undefined
    ? input.visibleVanshNumbers
    : existing.visibleVanshNumbers !== undefined
    ? existing.visibleVanshNumbers
    : existing.visibleVansh;
  const visibleVanshNumbers = visibleToAllVansh ? [] : ensureVisibleVanshNumbers(visibleVanshSource);
  let author = parseAuthorObjectId(input.author);
  if (!author) {
    if (existing.author instanceof ObjectId) {
      author = existing.author;
    } else if (parseAuthorObjectId(existing.author)) {
      author = parseAuthorObjectId(existing.author);
    } else if (ObjectId.isValid(user?.sub)) {
      author = new ObjectId(user.sub);
    }
  }
  return {
    title: trimmedStringOrEmpty(input.title || existing.title),
    summary: trimmedStringOrEmpty(input.summary || existing.summary),
    content: stringOrEmpty(input.content || existing.content),
    category: trimmedStringOrEmpty(input.category || existing.category),
    priority,
    tags,
    visibleToAllVansh,
    visibleVanshNumbers,
    images,
    publishDate,
    authorName: trimmedStringOrEmpty(input.authorName || existing.authorName),
    author: author || null,
    createdBy: existing.createdBy ?? (user?.sub ?? null),
    createdBySerNo: existing.createdBySerNo ?? (user?.serNo ?? null),
    createdAt,
    updatedAt: now,
  };
};

async function connectToMongo() {
  if (db) return db;
  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db(dbName);
  try {
    // Ensure unique index for dedupe on GogteKulamandalFamily
    await db.collection(collectionName).createIndex({ _sheetRowKey: 1 }, { unique: true, name: 'uniq_sheet_row_key' });
  } catch (e) {
    // ignore index errors if already exists
  }
  return db;
}

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';

const DATA_URI_REGEX = /^data:(.+?);base64,(.+)$/i;

const isIndexSegment = (segment) => /^\d+$/.test(String(segment));

const keyToSegments = (key) =>
  String(key)
    .replace(/\[(\w+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);

const cloneValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item));
  }
  if (isPlainObject(value)) {
    return Object.entries(value).reduce((acc, [k, v]) => {
      acc[k] = cloneValue(v);
      return acc;
    }, {});
  }
  if (value instanceof Date) {
    return new Date(value);
  }
  return value;
};

const setNestedLeaf = (target, segments, value) => {
  let current = target;
  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;
    const key = isIndexSegment(segment) ? Number(segment) : segment;
    if (isLast) {
      if (Array.isArray(current)) {
        current[key] = value;
      } else {
        current[key] = value;
      }
      return;
    }
    const nextIsIndex = isIndexSegment(segments[index + 1]);
    if (Array.isArray(current)) {
      if (!current[key]) {
        current[key] = nextIsIndex ? [] : {};
      }
      current = current[key];
    } else {
      if (!current[key]) {
        current[key] = nextIsIndex ? [] : {};
      }
      current = current[key];
    }
  });
};

const appendNestedArray = (target, segments, value) => {
  let current = target;
  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;
    const key = isIndexSegment(segment) ? Number(segment) : segment;
    if (isLast) {
      if (Array.isArray(current)) {
        if (!Array.isArray(current[key])) {
          current[key] = value.slice();
        } else {
          current[key] = current[key].concat(value);
        }
      } else {
        if (!Array.isArray(current[key])) {
          current[key] = value.slice();
        } else {
          current[key] = current[key].concat(value);
        }
      }
      return;
    }
    const nextIsIndex = isIndexSegment(segments[index + 1]);
    if (Array.isArray(current)) {
      if (!current[key]) {
        current[key] = nextIsIndex ? [] : {};
      }
      current = current[key];
    } else {
      if (!current[key]) {
        current[key] = nextIsIndex ? [] : {};
      }
      current = current[key];
    }
  });
};

const buildNestedObjectFromFlat = (input) => {
  if (!input || typeof input !== 'object') {
    return {};
  }
  return Object.entries(input).reduce((acc, [key, value]) => {
    const segments = keyToSegments(key);
    if (segments.length === 0) {
      return acc;
    }
    setNestedLeaf(acc, segments, value);
    return acc;
  }, {});
};

const convertFilesToPayload = (files) => {
  if (!files) {
    return {};
  }
  const collected = {};
  const processNode = (node, path = []) => {
    if (!node) {
      return;
    }
    if (Array.isArray(node)) {
      if (node.length > 0 && node[0] && node[0].buffer) {
        appendNestedArray(collected, path, node);
        return;
      }
      node.forEach((item, index) => {
        processNode(item, path.concat(index));
      });
      return;
    }
    if (typeof node === 'object') {
      Object.entries(node).forEach(([key, value]) => {
        processNode(value, path.concat(key));
      });
    }
  };
  if (Array.isArray(files)) {
    files.forEach((file) => {
      const segments = keyToSegments(file.fieldname);
      if (segments.length === 0) {
        return;
      }
      appendNestedArray(collected, segments, [file]);
    });
  } else {
    processNode(files);
  }
  const convertNode = (node) => {
    if (Array.isArray(node)) {
      if (node.length > 0 && node[0] && node[0].buffer) {
        const file = node[0];
        return {
          data: file.buffer.toString('base64'),
          mimeType: file.mimetype,
          originalName: file.originalname,
        };
      }
      return node.map((item) => convertNode(item)).filter((item) => item !== undefined);
    }
    if (isPlainObject(node)) {
      return Object.entries(node).reduce((acc, [key, value]) => {
        const converted = convertNode(value);
        if (converted !== undefined) {
          acc[key] = converted;
        }
        return acc;
      }, {});
    }
    return node;
  };
  return convertNode(collected);
};

const deepMerge = (target, source) => {
  if (target === undefined) {
    return cloneValue(source);
  }
  if (source === undefined) {
    return cloneValue(target);
  }
  if (Array.isArray(target) && Array.isArray(source)) {
    const result = target.map((item) => cloneValue(item));
    source.forEach((value, index) => {
      if (result[index] === undefined) {
        result[index] = cloneValue(value);
      } else {
        result[index] = deepMerge(result[index], value);
      }
    });
    return result;
  }
  if (isPlainObject(target) && isPlainObject(source)) {
    const result = Object.entries(target).reduce((acc, [key, value]) => {
      acc[key] = cloneValue(value);
      return acc;
    }, {});
    Object.entries(source).forEach(([key, value]) => {
      if (result[key] === undefined) {
        result[key] = cloneValue(value);
      } else {
        result[key] = deepMerge(result[key], value);
      }
    });
    return result;
  }
  return cloneValue(source);
};

const normalizePayload = (data, path = []) => {
  if (Array.isArray(data)) {
    return data
      .map((item, index) => normalizePayload(item, path.concat(index)))
      .filter((item) => item !== undefined && item !== null && item !== '');
  }
  if (isPlainObject(data)) {
    return Object.entries(data).reduce((acc, [key, value]) => {
      const normalized = normalizePayload(value, path.concat(key));
      if (normalized !== undefined && normalized !== null && normalized !== '') {
        acc[key] = normalized;
      }
      return acc;
    }, {});
  }
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
      return undefined;
    }
    const lastSegmentRaw = path[path.length - 1];
    const lastSegment = typeof lastSegmentRaw === 'number' ? String(lastSegmentRaw) : lastSegmentRaw || '';
    if (lastSegment && /date/i.test(lastSegment)) {
      const isoCandidate = trimmed.includes('T') ? trimmed : `${trimmed}T00:00:00.000Z`;
      const parsed = new Date(isoCandidate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    if (DATA_URI_REGEX.test(trimmed)) {
      const [, mimeType, base64] = trimmed.match(DATA_URI_REGEX) || [];
      if (mimeType && base64) {
        return {
          data: base64,
          mimeType,
          originalName: 'data-uri-upload',
        };
      }
    }
    if (lastSegment === 'vansh') {
      const num = Number(trimmed);
      return Number.isNaN(num) ? trimmed : num;
    }
    if (/SerNo$/i.test(lastSegment)) {
      const num = Number(trimmed);
      return Number.isNaN(num) ? trimmed : num;
    }
    return trimmed;
  }
  return data;
};

const cleanPayload = (data) => {
  if (Array.isArray(data)) {
    const cleaned = data
      .map((item) => cleanPayload(item))
      .filter((item) => item !== undefined && item !== null && item !== '');
    return cleaned.length ? cleaned : undefined;
  }
  if (isPlainObject(data)) {
    const cleaned = Object.entries(data).reduce((acc, [key, value]) => {
      const cleanedValue = cleanPayload(value);
      const emptyObject = isPlainObject(cleanedValue) && Object.keys(cleanedValue).length === 0;
      const emptyArray = Array.isArray(cleanedValue) && cleanedValue.length === 0;
      if (
        cleanedValue !== undefined &&
        cleanedValue !== null &&
        cleanedValue !== '' &&
        !emptyObject &&
        !emptyArray
      ) {
        acc[key] = cleanedValue;
      }
      return acc;
    }, {});
    return Object.keys(cleaned).length ? cleaned : undefined;
  }
  return data;
};

const prepareFormPayload = (body, files) => {
  const nestedBody = buildNestedObjectFromFlat(body);
  const normalizedBody = normalizePayload(nestedBody) || {};
  const filesPayload = convertFilesToPayload(files) || {};
  const mergedPayload = deepMerge(normalizedBody, filesPayload) || {};
  const basePayload = isPlainObject(mergedPayload) ? mergedPayload : {};
  const payloadWithTimestamps = {
    ...basePayload,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const cleaned = cleanPayload(payloadWithTimestamps);
  return cleaned || {};
};





app.get('/api/family/members', async (req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(collectionName);

    const query = {};
    if (req.query.level) {
      const level = parseInt(req.query.level);
      if (!Number.isNaN(level)) {
        query.level = level;
      }
    }

    const members = await collection.find(query).toArray();
    const normalizedMembers = members.map((member) => {
      const personal = member.personalDetails || {};
      return {
        ...member,
        serNo: Number.isNaN(Number(member.serNo)) ? member.serNo : Number(member.serNo),
        fatherSerNo: Number.isNaN(Number(member.fatherSerNo)) ? member.fatherSerNo ?? null : Number(member.fatherSerNo),
        motherSerNo: Number.isNaN(Number(member.motherSerNo)) ? member.motherSerNo ?? null : Number(member.motherSerNo),
        spouseSerNo: Number.isNaN(Number(member.spouseSerNo)) ? member.spouseSerNo ?? null : Number(member.spouseSerNo),
        childrenSerNos: Array.isArray(member.childrenSerNos)
          ? member.childrenSerNos.map((value) => (Number.isNaN(Number(value)) ? value : Number(value)))
          : [],
        profileImage: personal.profileImage || member.profileImage || null,
        firstName: personal.firstName || member.firstName || '',
        middleName: personal.middleName || member.middleName || '',
        lastName: personal.lastName || member.lastName || '',
        name: member.name || `${personal.firstName || ''} ${personal.middleName || ''} ${personal.lastName || ''}`.replace(/\s+/g, ' ').trim(),
        email: personal.email || member.email || '',
        mobileNumber: personal.mobileNumber || member.mobileNumber || member.phoneNumber || '',
        dateOfBirth: personal.dateOfBirth || member.dateOfBirth || null,
        vansh: personal.vansh || member.vansh || null,
        level: Number.isNaN(Number(member.level)) ? member.level ?? null : Number(member.level),
      };
    });

    console.log(`[family] db=${dbName} coll=${collectionName} query=${JSON.stringify(query)} count=${normalizedMembers.length}`);
    res.json({ members: normalizedMembers });
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Fetch members by multiple serial numbers (for children)
app.post('/api/family/members/by-sernos', async (req, res) => {
  try {
    const { serNos } = req.body;
    if (!Array.isArray(serNos) || serNos.length === 0) {
      return res.json({ members: [] });
    }

    const database = await connectToMongo();
    const collection = database.collection(collectionName);

    const normalizedSerNos = serNos.map((value) => {
      const numeric = Number(value);
      return Number.isNaN(numeric) ? String(value) : numeric;
    });

    const query = {
      serNo: { $in: [...serNos, ...normalizedSerNos] }
    };

    const members = await collection.find(query).toArray();
    const normalizedMembers = members.map((member) => {
      const personal = member.personalDetails || {};
      return {
        ...member,
        serNo: Number.isNaN(Number(member.serNo)) ? member.serNo : Number(member.serNo),
        fatherSerNo: Number.isNaN(Number(member.fatherSerNo)) ? member.fatherSerNo ?? null : Number(member.fatherSerNo),
        motherSerNo: Number.isNaN(Number(member.motherSerNo)) ? member.motherSerNo ?? null : Number(member.motherSerNo),
        spouseSerNo: Number.isNaN(Number(member.spouseSerNo)) ? member.spouseSerNo ?? null : Number(member.spouseSerNo),
        childrenSerNos: Array.isArray(member.childrenSerNos)
          ? member.childrenSerNos.map((value) => (Number.isNaN(Number(value)) ? value : Number(value)))
          : [],
        profileImage: personal.profileImage || member.profileImage || null,
        firstName: personal.firstName || member.firstName || '',
        middleName: personal.middleName || member.middleName || '',
        lastName: personal.lastName || member.lastName || '',
        name: member.name || `${personal.firstName || ''} ${personal.middleName || ''} ${personal.lastName || ''}`.replace(/\s+/g, ' ').trim(),
        email: personal.email || member.email || '',
        mobileNumber: personal.mobileNumber || member.mobileNumber || member.phoneNumber || '',
        dateOfBirth: personal.dateOfBirth || member.dateOfBirth || null,
        vansh: personal.vansh || member.vansh || null,
        level: Number.isNaN(Number(member.level)) ? member.level ?? null : Number(member.level),
      };
    });

    console.log(`[family] Fetched ${normalizedMembers.length} members by serNos:`, serNos);
    res.json({ members: normalizedMembers });
  } catch (err) {
    console.error('Error fetching members by serNos:', err);
    res.status(500).json({ error: 'Failed to fetch members by serial numbers' });
  }
});

// Fetch a single member by serial number (for spouse)
app.get('/api/family/members/by-serno/:serNo', async (req, res) => {
  try {
    const { serNo } = req.params;
    const database = await connectToMongo();
    const collection = database.collection(collectionName);

    const num = Number(serNo);
    const searchValues = Number.isNaN(num) ? [String(serNo)] : [num, String(serNo)];

    const query = {
      serNo: { $in: searchValues }
    };

    const member = await collection.findOne(query);
    if (!member) {
      return res.json({ member: null });
    }

    const personal = member.personalDetails || {};
    const normalizedMember = {
      ...member,
      serNo: Number.isNaN(Number(member.serNo)) ? member.serNo : Number(member.serNo),
      fatherSerNo: Number.isNaN(Number(member.fatherSerNo)) ? member.fatherSerNo ?? null : Number(member.fatherSerNo),
      motherSerNo: Number.isNaN(Number(member.motherSerNo)) ? member.motherSerNo ?? null : Number(member.motherSerNo),
      spouseSerNo: Number.isNaN(Number(member.spouseSerNo)) ? member.spouseSerNo ?? null : Number(member.spouseSerNo),
      childrenSerNos: Array.isArray(member.childrenSerNos)
        ? member.childrenSerNos.map((value) => (Number.isNaN(Number(value)) ? value : Number(value)))
        : [],
      profileImage: personal.profileImage || member.profileImage || null,
      firstName: personal.firstName || member.firstName || '',
      middleName: personal.middleName || member.middleName || '',
      lastName: personal.lastName || member.lastName || '',
      name: member.name || `${personal.firstName || ''} ${personal.middleName || ''} ${personal.lastName || ''}`.replace(/\s+/g, ' ').trim(),
      email: personal.email || member.email || '',
      mobileNumber: personal.mobileNumber || member.mobileNumber || member.phoneNumber || '',
      dateOfBirth: personal.dateOfBirth || member.dateOfBirth || null,
      vansh: personal.vansh || member.vansh || null,
      level: Number.isNaN(Number(member.level)) ? member.level ?? null : Number(member.level),
    };

    console.log(`[family] Fetched member by serNo ${serNo}:`, 'found');
    res.json({ member: normalizedMember });
  } catch (err) {
    console.error('Error fetching member by serNo:', err);
    res.status(500).json({ error: 'Failed to fetch member by serial number' });
  }
});

// New endpoint for visual family tree - returns all members
app.get('/api/family/members-new', async (req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(collectionName);
    
    const members = await collection.find({}).toArray();
    console.log(`[family] Fetched all members for visual tree: ${members.length}`);
    res.json(members);
  } catch (err) {
    console.error('Error fetching all members:', err);
    res.status(500).json({ error: 'Failed to fetch all members' });
  }
});

// Search members for parent autocomplete
app.get('/api/family/search', async (req, res) => {
  try {
    const { query, vansh } = req.query;

    if (!query || !vansh) {
      return res.status(400).json({
        success: false,
        data: []
      });
    }

    const database = await connectToMongo();
    const collection = database.collection(collectionName);

    const searchRegex = new RegExp(query, 'i');
    const vanshNum = Number(vansh);

    const vanshConditions = Number.isNaN(vanshNum)
      ? [
          { vansh: vansh },
          { 'personalDetails.vansh': vansh }
        ]
      : [
          { vansh: vanshNum },
          { vansh: vansh.toString() },
          { 'personalDetails.vansh': vanshNum },
          { 'personalDetails.vansh': vansh.toString() }
        ];

    const members = await collection
      .find({
        $and: [
          {
            $or: [
              { 'personalDetails.firstName': searchRegex },
              { 'personalDetails.lastName': searchRegex },
              { 'personalDetails.middleName': searchRegex },
              { name: searchRegex },
              { firstName: searchRegex },
              { lastName: searchRegex },
              { middleName: searchRegex }
            ]
          },
          { $or: vanshConditions }
        ]
      })
      .limit(10)
      .toArray();

    const data = members.map((member) => {
      const personal = member.personalDetails || {};
      const profileImage = personal.profileImage || member.profileImage || null;
      const mobile = personal.mobileNumber || personal.alternateMobileNumber || member.mobileNumber || member.phoneNumber || '';
      const firstName = personal.firstName || member.firstName || '';
      const middleName = personal.middleName || member.middleName || '';
      const lastName = personal.lastName || member.lastName || '';
      const composedName = member.name || `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, ' ').trim();

      return {
        serNo: member.serNo ?? personal.serNo ?? null,
        firstName,
        middleName,
        lastName,
        name: composedName,
        email: personal.email || member.email || '',
        mobileNumber: mobile,
        dateOfBirth: personal.dateOfBirth || member.dateOfBirth || '',
        profileImage
      };
    });

    console.log(`[family] Search query="${query}" vansh=${vansh} found=${data.length}`);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error searching members:', err);
    res.status(500).json({
      success: false,
      data: [],
      error: 'Failed to search members'
    });
  }
});

app.get('/api/members/celebrations', async (_req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(collectionName);
    const members = await collection
      .find({}, {
        projection: {
          serNo: 1,
          spouseSerNo: 1,
          marriedDetails: 1,
          remarriedDetails: 1,
          widowedDetails: 1,
          name: 1,
          firstName: 1,
          middleName: 1,
          lastName: 1,
          dateOfBirth: 1,
          dob: 1,
          birthDate: 1,
          personalDetails: 1,
          'Date of Birth': 1,
          DOB: 1,
          'Birth Date': 1
        }
      })
      .toArray();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const birthdays = [];
    const anniversariesMap = new Map();

    const toSerNoKey = (value) => {
      if (value === undefined || value === null) {
        return null;
      }
      if (typeof value === 'number' && !Number.isNaN(value)) {
        return String(value);
      }
      const trimmed = String(value).trim();
      if (!trimmed) {
        return null;
      }
      const numeric = Number(trimmed);
      if (!Number.isNaN(numeric)) {
        return String(numeric);
      }
      return trimmed;
    };

    const memberLookup = new Map();
    members.forEach((member) => {
      const key = toSerNoKey(member.serNo);
      if (key) {
        memberLookup.set(key, member);
      }
    });

    members.forEach((member) => {
      const personal = member.personalDetails || {};
      const rawBirthDate = pickFirstDefined([
        personal.dateOfBirth,
        personal.date_of_birth,
        personal.birthDate,
        personal.dob,
        member.dateOfBirth,
        member.dob,
        member.birthDate,
        member['Date of Birth'],
        member.DOB,
        member['Birth Date']
      ]);
      const parsedBirthDate = parseDateValue(rawBirthDate);
      if (!parsedBirthDate) {
        return;
      }
      const upcoming = new Date(today.getFullYear(), parsedBirthDate.getMonth(), parsedBirthDate.getDate());
      if (Number.isNaN(upcoming.getTime())) {
        return;
      }
      if (upcoming < today) {
        upcoming.setFullYear(upcoming.getFullYear() + 1);
      }
      const diffDays = (upcoming.getTime() - today.getTime()) / (24 * 60 * 60 * 1000);
      if (diffDays < 0 || diffDays > 7) {
        return;
      }
      const turningAge = upcoming.getFullYear() - parsedBirthDate.getFullYear();
      birthdays.push({
        serNo: member.serNo ?? null,
        name: composeMemberName(member),
        date: upcoming.toISOString(),
        originalDate: parsedBirthDate.toISOString(),
        category: 'birthday',
        turningAge: Number.isFinite(turningAge) ? turningAge : null
      });
    });

    birthdays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const composeSpouseName = (details) => {
      if (!details || typeof details !== 'object') {
        return '';
      }
      const direct = trimmedStringOrEmpty(details.spouseName || details.spouseFullName || details.spouse);
      if (direct) {
        return direct;
      }
      const parts = [
        details.spouseFirstName ?? details.firstName ?? details.name,
        details.spouseMiddleName ?? details.middleName,
        details.spouseLastName ?? details.lastName
      ]
        .map((part) => trimmedStringOrEmpty(part))
        .filter(Boolean);
      if (parts.length === 0) {
        return '';
      }
      return parts.join(' ');
    };

    const resolveMarriageDetails = (member) => {
      const sources = [
        member.marriedDetails,
        member.remarriedDetails,
        member.widowedDetails,
        member.personalDetails,
        member
      ].filter(Boolean);
      for (const source of sources) {
        const candidate = pickFirstDefined([
          source.dateOfMarriage,
          source.date_of_marriage,
          source.marriageDate,
          source.marriage_date,
          source.weddingDate,
          source.wedding_date,
          source.dateOfWedding,
          source.date_of_wedding,
          source.anniversaryDate,
          source.anniversary_date
        ]);
        const parsed = parseDateValue(candidate);
        if (parsed) {
          return { date: parsed, source };
        }
      }
      return { date: null, source: null };
    };

    members.forEach((member) => {
      const { date: marriageDate, source } = resolveMarriageDetails(member);
      if (!marriageDate) {
        return;
      }
      const upcoming = new Date(today.getFullYear(), marriageDate.getMonth(), marriageDate.getDate());
      if (Number.isNaN(upcoming.getTime())) {
        return;
      }
      if (upcoming < today) {
        upcoming.setFullYear(upcoming.getFullYear() + 1);
      }
      const diffDays = (upcoming.getTime() - today.getTime()) / (24 * 60 * 60 * 1000);
      if (diffDays < 0 || diffDays > 7) {
        return;
      }
      const primaryName = composeMemberName(member);
      const spouseKey = toSerNoKey(member.spouseSerNo);
      const spouseMember = spouseKey ? memberLookup.get(spouseKey) : null;
      const detailsSource = source || member.marriedDetails || member.remarriedDetails || member.widowedDetails || {};
      const spouseName = spouseMember ? composeMemberName(spouseMember) : composeSpouseName(detailsSource);
      if (!spouseName) {
        return;
      }
      const coupleIdentifiers = spouseMember
        ? [toSerNoKey(member.serNo), toSerNoKey(spouseMember.serNo)].filter(Boolean).sort()
        : [];
      const coupleKey = coupleIdentifiers.length > 0 ? coupleIdentifiers.join('-') : `${primaryName}::${spouseName}`;
      if (anniversariesMap.has(coupleKey)) {
        return;
      }
      const yearsMarried = upcoming.getFullYear() - marriageDate.getFullYear();
      anniversariesMap.set(coupleKey, {
        serNo: member.serNo ?? null,
        spouseSerNo: spouseMember?.serNo ?? member.spouseSerNo ?? null,
        name: `${primaryName} & ${spouseName}`,
        primaryName,
        spouseName,
        date: upcoming.toISOString(),
        originalDate: marriageDate.toISOString(),
        category: 'anniversary',
        yearsMarried: Number.isFinite(yearsMarried) ? yearsMarried : null
      });
    });

    const anniversaries = Array.from(anniversariesMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json({ birthdays, anniversaries });
  } catch (error) {
    console.error('Error fetching upcoming celebrations:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming celebrations' });
  }
});

// Get all relationships (static relationships from database)
app.get('/api/family/all-relationships', async (req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(collectionName);
    
    // Get all members and extract relationships
    const members = await collection.find({}).toArray();
    const relationships = [];
    
    members.forEach(member => {
      // Add spouse relationships
      if (member.spouseSerNo) {
        relationships.push({
          fromSerNo: member.serNo,
          toSerNo: member.spouseSerNo,
          relation: 'Spouse',
          relationMarathi: 'पती/पत्नी'
        });
      }
      
      // Add parent-child relationships
      if (member.sonDaughterSerNo && Array.isArray(member.sonDaughterSerNo)) {
        member.sonDaughterSerNo.forEach(childSerNo => {
          relationships.push({
            fromSerNo: member.serNo,
            toSerNo: childSerNo,
            relation: 'Child',
            relationMarathi: 'मुल/मुलगी'
          });
        });
      }
      
      // Add father relationship
      if (member.fatherSerNo) {
        relationships.push({
          fromSerNo: member.fatherSerNo,
          toSerNo: member.serNo,
          relation: 'Child',
          relationMarathi: 'मुल/मुलगी'
        });
      }
    });
    
    console.log(`[family] Generated ${relationships.length} static relationships`);
    res.json(relationships);
  } catch (err) {
    console.error('Error fetching relationships:', err);
    res.status(500).json({ error: 'Failed to fetch relationships' });
  }
});

// Dynamic relations endpoint - calculates relationships dynamically
app.get('/api/family/dynamic-relations/:serNo', async (req, res) => {
  try {
    const { serNo } = req.params;
    const database = await connectToMongo();
    const collection = database.collection(collectionName);
    
    // Convert serNo to number
    const memberSerNo = parseInt(serNo);
    
    // Get the target member
    const targetMember = await collection.findOne({
      $or: [{ serNo: memberSerNo }, { serNo: String(memberSerNo) }]
    });
    
    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    // Get all members for relationship calculation
    const allMembers = await collection.find({}).toArray();
    
    // Calculate dynamic relationships
    const dynamicRelations = [];
    
    allMembers.forEach(member => {
      if (member.serNo === targetMember.serNo) return; // Skip self
      
      const relation = calculateRelationship(targetMember, member, allMembers);
      if (relation) {
        dynamicRelations.push({
          related: member,
          relationEnglish: relation.english,
          relationMarathi: relation.marathi,
          relationshipPath: relation.path || []
        });
      }
    });
    
    console.log(`[family] Calculated ${dynamicRelations.length} dynamic relations for serNo ${serNo}`);
    res.json(dynamicRelations);
  } catch (err) {
    console.error('Error calculating dynamic relations:', err);
    res.status(500).json({ error: 'Failed to calculate dynamic relations' });
  }
});

// Helper function to calculate relationship between two members
function calculateRelationship(person1, person2, allMembers) {
  // Create a map for quick lookup
  const memberMap = new Map();
  allMembers.forEach(member => {
    memberMap.set(member.serNo, member);
  });
  
  // Direct relationships
  
  // Spouse
  if (person1.spouseSerNo === person2.serNo || person2.spouseSerNo === person1.serNo) {
    return { english: 'Spouse', marathi: 'पती/पत्नी' };
  }
  
  // Parent-Child
  if (person1.fatherSerNo === person2.serNo) {
    return { english: 'Father', marathi: 'वडील' };
  }
  if (person2.fatherSerNo === person1.serNo) {
    return { english: 'Son/Daughter', marathi: 'मुल/मुलगी' };
  }
  
  // Children
  if (person1.sonDaughterSerNo && person1.sonDaughterSerNo.includes(person2.serNo)) {
    return { english: 'Son/Daughter', marathi: 'मुल/मुलगी' };
  }
  if (person2.sonDaughterSerNo && person2.sonDaughterSerNo.includes(person1.serNo)) {
    return { english: 'Father/Mother', marathi: 'वडील/आई' };
  }
  
  // Siblings (same father)
  if (person1.fatherSerNo && person2.fatherSerNo && person1.fatherSerNo === person2.fatherSerNo) {
    return { english: 'Sibling', marathi: 'भाऊ/बहीण' };
  }
  
  // Grandparent-Grandchild
  const person1Father = memberMap.get(person1.fatherSerNo);
  const person2Father = memberMap.get(person2.fatherSerNo);
  
  if (person1Father && person1Father.fatherSerNo === person2.serNo) {
    return { english: 'Grandfather', marathi: 'आजोबा' };
  }
  if (person2Father && person2Father.fatherSerNo === person1.serNo) {
    return { english: 'Grandson/Granddaughter', marathi: 'नातू/नात' };
  }
  
  // Uncle-Nephew/Niece
  if (person1Father && person2.fatherSerNo === person1Father.serNo) {
    return { english: 'Uncle/Aunt', marathi: 'काका/मावशी' };
  }
  if (person2Father && person1.fatherSerNo === person2Father.serNo) {
    return { english: 'Nephew/Niece', marathi: 'पुतणा/पुतणी' };
  }
  
  // Cousins (same grandfather)
  if (person1Father && person2Father && 
      person1Father.fatherSerNo && person2Father.fatherSerNo &&
      person1Father.fatherSerNo === person2Father.fatherSerNo) {
    return { english: 'Cousin', marathi: 'चुलत भाऊ/बहीण' };
  }
  
  // If no direct relationship found, return null
  return null;
}

// DBA CRUD Operations for Family Members
// Get all family members (DBA only)
app.get('/api/dba/family-members', verifyToken, requireDBA, async (req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(collectionName);
    const members = await collection.find({}).toArray();
    res.json({ members });
  } catch (err) {
    console.error('Error fetching family members:', err);
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

// Create new family member (DBA only)
app.post('/api/dba/family-members', verifyToken, requireDBA, async (req, res) => {
  try {
    const memberData = req.body;
    const database = await connectToMongo();
    const collection = database.collection(collectionName);
    
    // Add timestamps
    memberData.createdAt = new Date();
    memberData.updatedAt = new Date();
    
    const result = await collection.insertOne(memberData);
    res.status(201).json({ 
      message: 'Family member created successfully',
      member: { ...memberData, _id: result.insertedId }
    });
  } catch (err) {
    console.error('Error creating family member:', err);
    res.status(500).json({ error: 'Failed to create family member' });
  }
});

// Update family member (DBA only)
app.put('/api/dba/family-members/:id', verifyToken, requireDBA, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const database = await connectToMongo();
    const collection = database.collection(collectionName);
    
    // Add update timestamp
    updateData.updatedAt = new Date();
    
    const result = await collection.updateOne(
      { _id: new (await import('mongodb')).ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Family member not found' });
    }
    
    res.json({ message: 'Family member updated successfully' });
  } catch (err) {
    console.error('Error updating family member:', err);
    res.status(500).json({ error: 'Failed to update family member' });
  }
});

// Delete family member (DBA only)
app.delete('/api/dba/family-members/:id', verifyToken, requireDBA, async (req, res) => {
  try {
    const { id } = req.params;
    const database = await connectToMongo();
    const collection = database.collection(collectionName);
    
    const result = await collection.deleteOne({ _id: new (await import('mongodb')).ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Family member not found' });
    }
    
    res.json({ message: 'Family member deleted successfully' });
  } catch (err) {
    console.error('Error deleting family member:', err);
    res.status(500).json({ error: 'Failed to delete family member' });
  }
});

// Get family member by ID (DBA only)
app.get('/api/dba/family-members/:id', verifyToken, requireDBA, async (req, res) => {
  try {
    const { id } = req.params;
    const database = await connectToMongo();
    const collection = database.collection(collectionName);
    
    const member = await collection.findOne({ _id: new (await import('mongodb')).ObjectId(id) });
    
    if (!member) {
      return res.status(404).json({ error: 'Family member not found' });
    }
    
    res.json({ member });
  } catch (err) {
    console.error('Error fetching family member:', err);
    res.status(500).json({ error: 'Failed to fetch family member' });
  }
});

// Test endpoint to check if API is working
app.get('/api/dba/test', verifyToken, requireDBA, async (req, res) => {
  res.json({ message: 'DBA API is working', timestamp: new Date().toISOString() });
});

// Get member relationships (DBA only)
app.get('/api/dba/member-relationships/:id', verifyToken, requireDBA, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching relationships for member ID:', id);
    
    const database = await connectToMongo();
    const collection = database.collection(collectionName);
    
    // Try to find member by ObjectId first, then by string ID
    let member;
    try {
      member = await collection.findOne({ _id: new (await import('mongodb')).ObjectId(id) });
    } catch (objectIdError) {
      console.log('ObjectId conversion failed, trying string match:', objectIdError.message);
      member = await collection.findOne({ _id: id });
    }
    
    if (!member) {
      console.log('Member not found with ID:', id);
      return res.status(404).json({ error: 'Member not found' });
    }
    
    console.log('Found member:', member.name || member.firstName || 'Unknown');
    
    // Get all members for relationship calculation
    const allMembers = await collection.find({}).toArray();
    console.log('Total members in database:', allMembers.length);
    
    // Calculate relationships
    const relationships = [];
    
    allMembers.forEach(otherMember => {
      if (otherMember._id.toString() === member._id.toString()) return; // Skip self
      
      const relation = calculateRelationship(member, otherMember, allMembers);
      if (relation) {
        relationships.push({
          member: {
            id: otherMember._id,
            name: otherMember.name || (otherMember.firstName && otherMember.lastName ? `${otherMember.firstName} ${otherMember.lastName}` : otherMember.firstName || otherMember.lastName || 'Unknown'),
            status: otherMember.status || 'Unknown'
          },
          relationEnglish: relation.english,
          relationMarathi: relation.marathi
        });
      }
    });
    
    console.log('Found relationships:', relationships.length);
    
    res.json({
      member: {
        id: member._id,
        name: member.name || (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : member.firstName || member.lastName || 'Unknown'),
        status: member.status || 'Unknown'
      },
      relationships
    });
  } catch (err) {
    console.error('Error fetching member relationships:', err);
    res.status(500).json({ error: 'Failed to fetch member relationships', details: err.message });
  }
});

// Get database statistics (DBA only)
app.get('/api/dba/stats', verifyToken, requireDBA, async (req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(collectionName);
    
    const totalMembers = await collection.countDocuments();
    const livingMembers = await collection.countDocuments({ status: 'living' });
    const deceasedMembers = await collection.countDocuments({ status: 'deceased' });
    
    // Get recent additions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAdditions = await collection.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });
    
    res.json({
      totalMembers,
      livingMembers,
      deceasedMembers,
      recentAdditions
    });
  } catch (err) {
    console.error('Error fetching database stats:', err);
    res.status(500).json({ error: 'Failed to fetch database statistics' });
  }
});

// Simple test endpoint (no auth required)
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', createAuthRouter(connectToMongo));

// Admin routes
app.get('/api/admin/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = await connectToMongo();
    const familyCollection = db.collection(collectionName);
    
    // Get family member statistics
    const totalMembers = await familyCollection.countDocuments();
    const livingMembers = await familyCollection.countDocuments({ 
      $or: [
        { 'Death Date': { $exists: false } },
        { 'Death Date': null },
        { 'Death Date': '' }
      ]
    });
    const deceasedMembers = await familyCollection.countDocuments({ 
      'Death Date': { $exists: true, $ne: null, $ne: '' }
    });
    
    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAdditions = await familyCollection.countDocuments({
      'Registration Date': { $gte: thirtyDaysAgo }
    });

    res.json({
      totalMembers,
      livingMembers,
      deceasedMembers,
      recentAdditions,
      pendingApprovals: 4, // Mock data for admin panel
      approvedMembers: 3,
      rejectedRequests: 1
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

// Admin family management routes
app.get('/api/admin/family-members', verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = await connectToMongo();
    const familyCollection = db.collection(collectionName);
    
    const members = await familyCollection.find({}).toArray();
    res.json(members);
  } catch (err) {
    console.error('Error fetching family members:', err);
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(eventsCollectionName);
    const documents = await collection.find({}).sort({ date: 1, createdAt: -1, _id: -1 }).toArray();
    await attachCreatorNamesToEvents(database, documents);
    const normalized = documents.map(normalizeEventDocument).filter(Boolean);
    const vanshFilter = trimmedStringOrEmpty(req.query?.vansh);
    const filtered = vanshFilter
      ? normalized.filter((event) => {
          if (event.visibleToAllVansh) return true;
          const list = Array.isArray(event.visibleVanshNumbers) ? event.visibleVanshNumbers : [];
          return list.includes(vanshFilter) || list.includes(String(Number(vanshFilter)));
        })
      : normalized;
    res.json({ events: filtered });
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.put('/api/events/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid event id' });
    }
    const database = await connectToMongo();
    const collection = database.collection(eventsCollectionName);
    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const payload = buildEventPayload(req.body, req.user, existing);
    if (!payload.eventName || !payload.eventType || !payload.date) {
      return res.status(400).json({ error: 'Event name, type, and date are required' });
    }
    await collection.updateOne({ _id: new ObjectId(id) }, { $set: payload });
    const updated = normalizeEventDocument({ _id: existing._id, ...payload });
    res.json(updated);
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(newsCollectionName);
    const documents = await collection.find({}).sort({ createdAt: -1, _id: -1 }).toArray();
    res.json(documents.map(normalizeNewsDocument).filter(Boolean));
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

app.post('/api/news', verifyToken, async (req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(newsCollectionName);
    const payload = buildNewsPayload(req.body, req.user);
    const result = await collection.insertOne(payload);
    const created = normalizeNewsDocument({ _id: result.insertedId, ...payload });
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating news:', err);
    res.status(500).json({ error: 'Failed to create news' });
  }
});

app.put('/api/news/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid news id' });
    }
    const database = await connectToMongo();
    const collection = database.collection(newsCollectionName);
    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return res.status(404).json({ error: 'News not found' });
    }
    const payload = buildNewsPayload(req.body, req.user, existing);
    await collection.updateOne({ _id: new ObjectId(id) }, { $set: payload });
    const updated = normalizeNewsDocument({ _id: existing._id, ...payload });
    res.json(updated);
  } catch (err) {
    console.error('Error updating news:', err);
    res.status(500).json({ error: 'Failed to update news' });
  }
});

app.delete('/api/news/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid news id' });
    }
    const database = await connectToMongo();
    const collection = database.collection(newsCollectionName);
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'News not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting news:', err);
    res.status(500).json({ error: 'Failed to delete news' });
  }
});

app.delete('/api/events/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid event id' });
    }
    const database = await connectToMongo();
    const collection = database.collection(eventsCollectionName);
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Admin news management routes
app.get('/api/admin/news', verifyToken, requireAdmin, async (req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(newsCollectionName);
    const documents = await collection.find({}).sort({ createdAt: -1, _id: -1 }).toArray();
    res.json(documents.map(normalizeNewsDocument).filter(Boolean));
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Hierarchical Family Tree Endpoint - Single Root Node (Fixed for nested schema)
app.get('/api/family/hierarchical-tree', async (req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection(collectionName);
    const allMembers = await collection.find({}).toArray();
    
    console.log(`[HIERARCHICAL] Building single-root tree from ${allMembers.length} members`);
    
    // Helper function to get full name from nested structure
    function getFullName(member) {
      // Try nested schema first (newer format)
      if (member.personalDetails) {
        const first = member.personalDetails.firstName || '';
        const middle = member.personalDetails.middleName || '';
        const last = member.personalDetails.lastName || '';
        return `${first} ${middle} ${last}`.trim().replace(/\s+/g, ' ');
      }
      // Fallback to flat structure (older format)
      const first = member["First Name"] || member.firstName || '';
      const middle = member["Middle Name"] || member.middleName || '';
      const last = member["Last Name"] || member.lastName || '';
      return `${first} ${middle} ${last}`.trim().replace(/\s+/g, ' ');
    }

    // Helper function to get father's name from nested structure
    function getFatherName(member) {
      // Try nested schema first
      if (member.parentsInformation) {
        const first = member.parentsInformation.fatherFirstName || '';
        const middle = member.parentsInformation.fatherMiddleName || '';
        const last = member.parentsInformation.fatherLastName || '';
        return `${first} ${middle} ${last}`.trim().replace(/\s+/g, ' ');
      }
      // Fallback to flat structure
      const first = member["Father 's First Name "] || member["Father's First Name"] || '';
      const last = member["Father 's Last Name "] || member["Father's Last Name"] || '';
      return `${first} ${last}`.trim().replace(/\s+/g, ' ');
    }

    // Helper to get spouse name
    function getSpouseName(member) {
      if (member.marriedDetails) {
        const first = member.marriedDetails.spouseFirstName || '';
        const last = member.marriedDetails.spouseLastName || '';
        return `${first} ${last}`.trim().replace(/\s+/g, ' ');
      }
      return '';
    }

    // Helper to get gender
    function getGender(member) {
      if (member.personalDetails) return member.personalDetails.gender || 'Unknown';
      return member.Gender || 'Unknown';
    }

    // Create a map of all people by serNo (primary key)
    const memberMap = new Map();
    const childrenMap = new Map(); // Map of fatherSerNo to array of children
    
    allMembers.forEach(member => {
      if (member.serNo !== undefined && member.serNo !== null) {
        memberMap.set(member.serNo, member);
        
        // Build children map for faster lookups
        const fatherSerNo = member.fatherSerNo;
        if (fatherSerNo !== undefined && fatherSerNo !== null && fatherSerNo !== '') {
          if (!childrenMap.has(fatherSerNo)) {
            childrenMap.set(fatherSerNo, []);
          }
          childrenMap.get(fatherSerNo).push(member);
        }
      }
    });

    // Helper function to build tree node in CardFamilyTree format
    function buildTreeNode(member, processed = new Set()) {
      if (!member || processed.has(member.serNo)) {
        return null;
      }
      processed.add(member.serNo);

      const fullName = getFullName(member);
      const fatherSerNo = member.fatherSerNo;
      const spouseName = getSpouseName(member);

      // Get children - use pre-built map for O(1) lookup instead of O(n)
      const children = [];
      const memberChildren = childrenMap.get(member.serNo) || [];
      memberChildren.forEach(childMember => {
        if (!processed.has(childMember.serNo)) {
          const childNode = buildTreeNode(childMember, processed);
          if (childNode) children.push(childNode);
        }
      });

      return {
        name: fullName || `Member #${member.serNo}`,
        attributes: {
          serNo: member.serNo,
          gender: getGender(member),
          spouse: spouseName,
          vansh: member.vansh || '',
          dob: member.personalDetails?.dateOfBirth || member['Date of Birth'] || '',
          email: member.personalDetails?.email || member.Email || ''
        },
        children: children
      };
    }

    // Find root member (someone with no father or serNo 1)
    let rootMember = null;
    
    // First, try to find serNo 1 as root
    for (const member of allMembers) {
      if (member.serNo === 1 || member.serNo === '1') {
        rootMember = member;
        console.log(`[HIERARCHICAL] Using serNo 1 as root: ${getFullName(member)}`);
        break;
      }
    }

    // If no serNo 1, find someone with no father
    if (!rootMember) {
      for (const member of allMembers) {
        if (!member.fatherSerNo || member.fatherSerNo === null || member.fatherSerNo === '') {
          rootMember = member;
          console.log(`[HIERARCHICAL] Using natural root (no father): ${getFullName(member)}`);
          break;
        }
      }
    }

    // Build the tree
    let treeRoot = null;
    if (rootMember) {
      treeRoot = buildTreeNode(rootMember);
    }

    console.log(`[HIERARCHICAL] Tree built successfully. Root: ${rootMember ? getFullName(rootMember) : 'None'}`);

    res.json(treeRoot || {
      name: 'No Family Data',
      attributes: { serNo: 0, gender: 'Unknown', spouse: '', vansh: '' },
      children: []
    });
    
  } catch (err) {
    console.error('Error building single-root hierarchical tree:', err);
    res.status(500).json({ error: 'Failed to build hierarchical family tree' });
  }
});

// Family member registration endpoint - handles comprehensive family form
const uploadFields = upload.fields([
  { name: "personalDetails.profileImage", maxCount: 1 },
  { name: "divorcedDetails.spouseProfileImage", maxCount: 1 },
  { name: "marriedDetails.spouseProfileImage", maxCount: 1 },
  { name: "remarriedDetails.spouseProfileImage", maxCount: 1 },
  { name: "widowedDetails.spouseProfileImage", maxCount: 1 },
  { name: "parentsInformation.fatherProfileImage", maxCount: 1 },
  { name: "parentsInformation.motherProfileImage", maxCount: 1 },
]);

app.post('/api/family/register', uploadFields, parseNestedFields, async (req, res) => {
  try {
    console.log('📥 POST /api/family/register - Family member registration received');
    const database = await connectToMongo();
    const collection = database.collection('Heirarchy_form');
    const payload = prepareFormPayload(req.body, req.files);
    const result = await collection.insertOne(payload);
    console.log(`✅ Family member registered successfully with ID: ${result.insertedId}`);
    res.status(201).json({
      message: 'Family member registered successfully',
      memberId: result.insertedId,
    });
  } catch (err) {
    console.error('❌ Error registering family member:', err);
    res.status(500).json({ error: 'Failed to register family member', details: err.message });
  }
});

// Search parents endpoint for autocomplete
app.get('/api/family/search', async (req, res) => {
  try {
    const { query, vansh } = req.query;
    
    if (!query || !vansh) {
      return res.json({ success: false, data: [] });
    }

    const database = await connectToMongo();
    const collection = database.collection('members'); // Search in main members collection
    
    // Create search regex for flexible matching
    const searchRegex = new RegExp(query, 'i');
    
    const members = await collection.find({
      vansh: parseInt(vansh),
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { 'name': searchRegex }
      ]
    }).limit(10).toArray();

    res.json({
      success: true,
      data: members.map(m => ({
        serNo: m.serNo,
        name: `${m.firstName || ''} ${m.lastName || ''}`.trim(),
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        mobileNumber: m.mobileNumber,
        dateOfBirth: m.dateOfBirth,
      }))
    });
  } catch (err) {
    console.error('Error searching parents:', err);
    res.json({ success: false, data: [], error: err.message });
  }
});

// Family member registration endpoint - accepts multipart form data with images
app.post('/api/family/add', upload.any(), parseNestedFields, async (req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection('Heirarchy_form');
    const payload = prepareFormPayload(req.body, req.files);
    const result = await collection.insertOne(payload);
    res.json({
      success: true,
      message: 'Family member registered successfully!',
      id: result.insertedId,
      data: payload
    });
  } catch (err) {
    console.error('Error registering family member:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to register family member: ' + err.message
    });
  }
});

// ============= EVENT ENDPOINTS =============

// Create new event with optional image upload
app.post('/api/events', verifyToken, (req, res, next) => {
  process.stdout.write('\n=== MULTER UPLOAD MIDDLEWARE CALLED ===\n');
  upload.single('eventImage')(req, res, (err) => {
    if (err) {
      process.stdout.write('MULTER ERROR: ' + err.message + '\n');
      return res.status(400).json({ error: 'File upload error: ' + err.message });
    }
    process.stdout.write('MULTER SUCCESS - File processing complete\n');
    next();
  });
}, async (req, res) => {
  process.stdout.write('\n\n=== DEBUGGING EVENT CREATION ===\n');
  process.stdout.write('Received POST /api/events request\n');
  process.stdout.write('req.body keys: ' + Object.keys(req.body).join(', ') + '\n');
  process.stdout.write('title: ' + req.body.title + '\n');
  process.stdout.write('eventType: ' + req.body.eventType + '\n');
  process.stdout.write('fromDate: ' + req.body.fromDate + '\n');
  process.stdout.write('===============================\n\n');
  
  try {
    const database = await connectToMongo();
    const collection = database.collection('events');

    const {
      title,
      description,
      eventType,
      fromDate,
      toDate,
      fromTime,
      toTime,
      priority,
      venue,
      venueStreet,
      city,
      state,
      pincode,
      country,
      address,
      visibleToAllVansh,
      visibleVanshNumbers
    } = req.body;

    // Debug logging
    process.stdout.write('After destructuring - title: ' + title + ', eventType: ' + eventType + ', fromDate: ' + fromDate + '\n');

    // Validation
    process.stdout.write('Starting validation checks...\n');
    process.stdout.write('Checking title: ' + JSON.stringify(title) + '\n');
    if (!title || !title.trim()) {
      process.stdout.write('VALIDATION FAILED: Missing or empty title\n');
      return res.status(400).json({ success: false, message: 'Event name, type, and date are required' });
    }
    process.stdout.write('Title check passed\n');
    
    process.stdout.write('Checking eventType: ' + JSON.stringify(eventType) + '\n');
    if (!eventType || !eventType.trim()) {
      process.stdout.write('VALIDATION FAILED: Missing or empty eventType\n');
      return res.status(400).json({ success: false, message: 'Event name, type, and date are required' });
    }
    process.stdout.write('EventType check passed\n');
    
    process.stdout.write('Checking fromDate: ' + JSON.stringify(fromDate) + '\n');
    if (!fromDate) {
      process.stdout.write('VALIDATION FAILED: Missing fromDate\n');
      return res.status(400).json({ success: false, message: 'Event name, type, and date are required' });
    }
    process.stdout.write('FromDate check passed\n');

    // Parse dates
    const parsedFromDate = new Date(fromDate);
    if (isNaN(parsedFromDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid from date format' });
    }

    let parsedToDate = parsedFromDate; // Default to fromDate if not provided
    if (toDate) {
      parsedToDate = new Date(toDate);
      if (isNaN(parsedToDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid to date format' });
      }
      if (parsedToDate < parsedFromDate) {
        return res.status(400).json({ success: false, message: 'To date must be greater than or equal to from date' });
      }
    }

    // Handle image upload
    let eventImageData = null;
    if (req.file) {
      // Convert image to base64 for storage in MongoDB
      const imageBuffer = req.file.buffer;
      eventImageData = {
        data: imageBuffer.toString('base64'),
        mimetype: req.file.mimetype,
        filename: req.file.originalname,
        size: req.file.size,
        uploadedAt: new Date()
      };
    }

    const trimmedVenue = trimmedStringOrEmpty(venue);
    const trimmedVenueStreet = trimmedStringOrEmpty(venueStreet);
    const trimmedCity = trimmedStringOrEmpty(city);
    const trimmedState = trimmedStringOrEmpty(state);
    const trimmedPincode = trimmedStringOrEmpty(pincode);
    const trimmedCountry = trimmedStringOrEmpty(country) || 'India';
    const manualAddress = trimmedStringOrEmpty(address);
    const derivedAddressParts = [trimmedVenueStreet, trimmedCity, trimmedState, trimmedPincode, trimmedCountry].filter(Boolean);
    const normalizedAddress = manualAddress || derivedAddressParts.join(', ');
    const visibleForAll = toBoolean(visibleToAllVansh);
    const normalizedVisibleVanshNumbers = visibleForAll ? [] : ensureVisibleVanshNumbers(visibleVanshNumbers);

    const createdAt = new Date();
    const resolvedCreatorName = await resolveMemberNameBySerNo(database, req.user?.serNo);
    const eventData = {
      title: title.trim(),
      description: description ? description.trim() : '',
      eventType: eventType ? eventType.trim() : 'General',
      fromDate: parsedFromDate,
      toDate: parsedToDate,
      fromTime: fromTime ? fromTime.trim() : '',
      toTime: toTime ? toTime.trim() : '',
      priority: priority ? priority.trim() : 'low',
      eventImage: eventImageData,
      venue: trimmedVenue,
      venueStreet: trimmedVenueStreet,
      city: trimmedCity,
      state: trimmedState,
      pincode: trimmedPincode,
      country: trimmedCountry,
      address: normalizedAddress,
      visibleToAllVansh: visibleForAll,
      visibleVanshNumbers: normalizedVisibleVanshNumbers,
      createdBy: req.user?.sub ? String(req.user.sub) : null,
      createdBySerNo: req.user?.serNo ?? null,
      createdByName: resolvedCreatorName,
      createdAt,
      updatedAt: createdAt
    };

    const result = await collection.insertOne(eventData);

    res.json({
      success: true,
      message: 'Event created successfully',
      id: result.insertedId,
      data: {
        _id: result.insertedId,
        ...eventData,
        eventImage: eventImageData ? { ...eventImageData, data: undefined } : null // Don't return base64 in response
      }
    });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create event: ' + err.message
    });
  }
});

// Get all events
app.get('/api/events', async (req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection('events');

    const events = await collection
      .find({})
      .sort({ fromDate: 1 })  // Sort ascending: soonest events first
      .toArray();

    // Process events to include image data
    const processedEvents = events.map(event => {
      if (event.eventImage && event.eventImage.data) {
        return {
          ...event,
          eventImage: {
            dataUrl: `data:${event.eventImage.mimetype};base64,${event.eventImage.data}`,
            filename: event.eventImage.filename,
            size: event.eventImage.size
          }
        };
      }
      return event;
    });

    res.json({
      success: true,
      data: processedEvents
    });
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events: ' + err.message
    });
  }
});

// Get single event by ID
app.get('/api/events/:id', async (req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection('events');

    const eventId = new ObjectId(req.params.id);
    const event = await collection.findOne({ _id: eventId });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Include image data as data URL
    if (event.eventImage && event.eventImage.data) {
      event.eventImage = {
        dataUrl: `data:${event.eventImage.mimetype};base64,${event.eventImage.data}`,
        filename: event.eventImage.filename,
        size: event.eventImage.size
      };
    }

    res.json({
      success: true,
      data: event
    });
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event: ' + err.message
    });
  }
});

// Update event
app.put('/api/events/:id', upload.single('eventImage'), async (req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection('events');

    const eventId = new ObjectId(req.params.id);
    const {
      title,
      description,
      eventType,
      fromDate,
      toDate,
      fromTime,
      toTime,
      priority,
      venue,
      venueStreet,
      city,
      state,
      pincode,
      country,
      address,
      visibleToAllVansh,
      visibleVanshNumbers
    } = req.body;

    // Get existing event
    const existingEvent = await collection.findOne({ _id: eventId });
    if (!existingEvent) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Validate dates if provided
    let parsedFromDate = existingEvent.fromDate;
    let parsedToDate = existingEvent.toDate;

    if (fromDate) {
      parsedFromDate = new Date(fromDate);
      if (isNaN(parsedFromDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid from date format' });
      }
    }

    if (toDate) {
      parsedToDate = new Date(toDate);
      if (isNaN(parsedToDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid to date format' });
      }
    } else if (fromDate) {
      parsedToDate = parsedFromDate; // Default to fromDate
    }

    if (parsedToDate < parsedFromDate) {
      return res.status(400).json({ success: false, message: 'To date must be greater than or equal to from date' });
    }

    // Handle image update
    let eventImage = existingEvent.eventImage;
    if (req.file) {
      const imageBuffer = req.file.buffer;
      eventImage = {
        data: imageBuffer.toString('base64'),
        mimetype: req.file.mimetype,
        filename: req.file.originalname,
        size: req.file.size,
        uploadedAt: new Date()
      };
    }

    const trimmedVenue = trimmedStringOrEmpty(venue);
    const trimmedVenueStreet = trimmedStringOrEmpty(venueStreet);
    const trimmedCity = trimmedStringOrEmpty(city);
    const trimmedState = trimmedStringOrEmpty(state);
    const trimmedPincode = trimmedStringOrEmpty(pincode);
    const trimmedCountry = trimmedStringOrEmpty(country);
    const manualAddress = trimmedStringOrEmpty(address);
    const derivedAddressParts = [trimmedVenueStreet || trimmedStringOrEmpty(existingEvent.venueStreet), trimmedCity || trimmedStringOrEmpty(existingEvent.city), trimmedState || trimmedStringOrEmpty(existingEvent.state), trimmedPincode || trimmedStringOrEmpty(existingEvent.pincode), (trimmedCountry || trimmedStringOrEmpty(existingEvent.country) || 'India')].filter(Boolean);
    const normalizedAddress = manualAddress || existingEvent.address || derivedAddressParts.join(', ');
    const visibleForAll = visibleToAllVansh !== undefined ? toBoolean(visibleToAllVansh) : toBoolean(existingEvent.visibleToAllVansh);
    const normalizedVisibleVanshNumbers = visibleForAll
      ? []
      : ensureVisibleVanshNumbers(visibleVanshNumbers !== undefined ? visibleVanshNumbers : existingEvent.visibleVanshNumbers);

    const updateData = {
      title: title ? title.trim() : existingEvent.title,
      description: description !== undefined ? (description ? description.trim() : '') : existingEvent.description,
      eventType: eventType ? eventType.trim() : existingEvent.eventType,
      fromDate: parsedFromDate,
      toDate: parsedToDate,
      fromTime: fromTime !== undefined ? fromTime.trim() : existingEvent.fromTime,
      toTime: toTime !== undefined ? toTime.trim() : existingEvent.toTime,
      priority: priority ? priority.trim() : existingEvent.priority,
      eventImage: eventImage,
      venue: trimmedVenue || existingEvent.venue,
      venueStreet: trimmedVenueStreet || existingEvent.venueStreet,
      city: trimmedCity || existingEvent.city,
      state: trimmedState || existingEvent.state,
      pincode: trimmedPincode || existingEvent.pincode,
      country: trimmedCountry || existingEvent.country || 'India',
      address: normalizedAddress,
      visibleToAllVansh: visibleForAll,
      visibleVanshNumbers: normalizedVisibleVanshNumbers,
      updatedAt: new Date()
    };

    await collection.updateOne({ _id: eventId }, { $set: updateData });

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: {
        _id: eventId,
        ...updateData,
        eventImage: eventImage ? { ...eventImage, data: undefined } : null
      }
    });
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update event: ' + err.message
    });
  }
});

// Delete event
app.delete('/api/events/:id', async (req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection('events');

    const eventId = new ObjectId(req.params.id);
    const result = await collection.deleteOne({ _id: eventId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event: ' + err.message
    });
  }
});

// Get events by date range
app.get('/api/events/range/search', async (req, res) => {
  try {
    const database = await connectToMongo();
    const collection = database.collection('events');

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    const events = await collection
      .find({
        fromDate: { $lte: end },
        toDate: { $gte: start }
      })
      .sort({ fromDate: 1 })
      .toArray();

    const processedEvents = events.map(event => {
      if (event.eventImage && event.eventImage.data) {
        return {
          ...event,
          eventImage: {
            dataUrl: `data:${event.eventImage.mimetype};base64,${event.eventImage.data}`,
            filename: event.eventImage.filename,
            size: event.eventImage.size
          }
        };
      }
      return event;
    });

    res.json({
      success: true,
      data: processedEvents
    });
  } catch (err) {
    console.error('Error fetching events by date range:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events: ' + err.message
    });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
  console.log(`Test endpoint: http://localhost:${port}/api/test`);
});


