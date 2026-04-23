const { z } = require('zod');

const validationPayload = (req, code, zodError) => {
    const first = zodError.errors[0];
    return {
        error: first ? first.message : 'Datos inválidos',
        code,
        errors: zodError.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
    };
};

const validate = (schema) => (req, res, next) => {
    try {
        req.validatedData = schema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(validationPayload(req, 'VALIDATION_ERROR', error));
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
            return res.status(400).json(validationPayload(req, 'INVALID_PARAMETERS', error));
        }
        next(error);
    }
};

const validateQuery = (schema) => (req, res, next) => {
    try {
        req.validatedQuery = schema.parse(req.query);
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(validationPayload(req, 'INVALID_QUERY', error));
        }
        next(error);
    }
};

module.exports = { validate, validateParams, validateQuery };
