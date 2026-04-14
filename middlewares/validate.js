const { z } = require('zod');

const validate = (schema) => (req, res, next) => {
    try {
        req.validatedData = schema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
            });
        }
        next(error);
    }
};

const validateParams = (schema) => (req, res, next) => {
    try {
        req.validatedParams = schema.parse(req.params);
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Invalid parameters',
                errors: error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
            });
        }
        next(error);
    }
};

module.exports = { validate, validateParams };
