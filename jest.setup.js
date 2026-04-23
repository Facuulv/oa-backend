/**
 * Variables mínimas antes de cargar `server` o `config/jwt` en tests.
 * (jwt.js exige JWT_SECRET >= 32 caracteres.)
 * Las credenciales de MySQL se toman del `.env` del entorno si existen; no forzar valores falsos
 * para evitar intentos de reconexión y handles abiertos en Jest.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'jest-test-secret-32-characters!!';
