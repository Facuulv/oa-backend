const { z } = require('zod');

const idParamSchema = z.object({
    id: z
        .string()
        .regex(/^\d+$/, 'ID must be a number')
        .transform(Number),
});

module.exports = { idParamSchema };
