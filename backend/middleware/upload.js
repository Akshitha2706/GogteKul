import multer from 'multer';

// Store files in memory for processing
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Middleware to parse nested form fields from multer
export const parseNestedFields = (req, res, next) => {
  if (!req.files) {
    return next();
  }

  const files = {};
  Object.keys(req.files).forEach(fieldName => {
    const value = req.files[fieldName];
    const parts = fieldName.split('.');
    
    let current = files;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
  });

  req.files = files;
  next();
};