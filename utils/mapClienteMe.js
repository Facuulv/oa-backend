const { ROLES } = require('../config/constants');

const formatDateOnly = (value) => {
    if (value == null || value === '') return null;
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    const text = String(value);
    return text.length >= 10 ? text.slice(0, 10) : text;
};

const mapClienteMe = (c) => ({
    id: c.id,
    email: c.email,
    nombre: c.nombre,
    apellido: c.apellido,
    dni: c.dni ?? null,
    rol: ROLES.CLIENTE,
    telefono: c.telefono ?? null,
    fecha_nacimiento: formatDateOnly(c.fecha_nacimiento),
    activo: c.activo,
    fecha_creacion: c.fecha_creacion,
    origen: 'CLIENTE',
});

module.exports = { mapClienteMe, formatDateOnly };
