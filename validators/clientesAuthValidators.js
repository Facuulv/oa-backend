const { z } = require('zod');
const { registerSchema } = require('./authValidators');

/** `useCookie` por defecto `true` para el endpoint legado `POST /clientes/register`. */
const registerClienteCookieSchema = registerSchema.extend({
    useCookie: z.boolean().optional().default(true),
});

module.exports = {
    registerClienteCookieSchema,
};
