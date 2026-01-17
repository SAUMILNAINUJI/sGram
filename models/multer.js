// const multer = require("multer");
// const path = require("path");
// const crypto = require("crypto");

// // Allowed image types
// const allowedTypes = /jpeg|jpg|png|gif|webp/;

// // Storage
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, path.join(__dirname, "../public/images/uploads"));
//     },
//     filename: function (req, file, cb) {
//         crypto.randomBytes(12, (err, buffer) => {
//             if (err) return cb(err);

//             const ext = path.extname(file.originalname).toLowerCase();
//             const filename = buffer.toString("hex") + ext;
//             cb(null, filename);
//         });
//     }
// });

// // File filter (security)
// const fileFilter = (req, file, cb) => {
//     const extname = allowedTypes.test(
//         path.extname(file.originalname).toLowerCase()
//     );
//     const mimetype = allowedTypes.test(file.mimetype);

//     if (extname && mimetype) {
//         cb(null, true);
//     } else {
//         cb(new Error("Only image files are allowed!"));
//     }
// };

// // Multer upload
// const upload = multer({
//     storage,
//     fileFilter,
//     limits: {
//         fileSize: 5 * 1024 * 1024 // 1MB per image
//     }
// });

// module.exports = upload;
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

// Allowed image types
const allowedTypes = /jpeg|jpg|png|gif|webp/;

// Ensure upload folder exists
const uploadPath = path.join(__dirname, "../public/images/uploads");
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        crypto.randomBytes(12, (err, buffer) => {
            if (err) return cb(err);
            const ext = path.extname(file.originalname).toLowerCase();
            const filename = buffer.toString("hex") + ext;
            cb(null, filename);
        });
    }
});

// File filter (security)
const fileFilter = (req, file, cb) => {
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) cb(null, true);
    else cb(new Error("Only image files are allowed!"));
};

// Multer upload
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

module.exports = upload;
