require('dotenv').config();

const assertJwtConfig = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        console.error('[oa-api] JWT_SECRET must be set and at least 32 characters');
        process.exit(1);
    }
};

assertJwtConfig();

module.exports = { assertJwtConfig };
