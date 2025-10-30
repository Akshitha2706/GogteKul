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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
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

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
  console.log(`Test endpoint: http://localhost:${port}/api/test`);
});


