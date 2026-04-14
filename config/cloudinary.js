const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
        }
    },
});

const uploadSingle = upload.single('image');

async function uploadToCloudinary(fileBuffer, options = {}) {
    const folder = options.folder || process.env.CLOUDINARY_FOLDER || 'oa/products';

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
                ...options,
            },
            (error, result) => {
                if (error) return reject(error);
                resolve({ url: result.secure_url, publicId: result.public_id });
            },
        );
        stream.end(fileBuffer);
    });
}

async function deleteFromCloudinary(publicId) {
    if (!publicId) return null;
    return cloudinary.uploader.destroy(publicId);
}

module.exports = {
    cloudinary,
    uploadSingle,
    uploadToCloudinary,
    deleteFromCloudinary,
};
