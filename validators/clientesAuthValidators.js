const { z } = require('zod');
const {
    registerSchemaBase,
    registerBirthDateRefine,
    registerBirthDateRefineOpts,
} = require('./authValidators');

/** `useCookie` por defecto `true` para el endpoint legado `POST /clientes/register`. */
const registerClienteCookieSchema = registerSchemaBase
    .extend({
        useCookie: z.boolean().optional().default(true),
    })
    .refine(registerBirthDateRefine, registerBirthDateRefineOpts);

module.exports = {
    registerClienteCookieSchema,
};
