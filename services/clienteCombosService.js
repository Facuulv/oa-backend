const { AppError } = require('../middlewares/errorHandler');
const clienteComboRepository = require('../repositories/clienteComboRepository');

function mapRow(row) {
    let payload = {};
    try {
        payload = row.payload_json ? JSON.parse(row.payload_json) : {};
    } catch {
        payload = {};
    }

    return {
        ...payload,
        id: String(row.id),
        name: row.nombre,
        label: row.etiqueta ?? payload.label ?? null,
        total: row.total != null ? Number(row.total) : payload.total ?? null,
        savedAt: row.fecha_creacion ? new Date(row.fecha_creacion).getTime() : Date.now(),
        createdAt: row.fecha_creacion,
        updatedAt: row.fecha_modificacion ?? null,
    };
}

async function listClienteCombos(clienteId) {
    await clienteComboRepository.ensureTable();
    const rows = await clienteComboRepository.listByCliente(clienteId);
    return rows.map(mapRow);
}

async function createClienteCombo(clienteId, payload) {
    await clienteComboRepository.ensureTable();
    const id = await clienteComboRepository.insertCombo(clienteId, payload);
    const rows = await clienteComboRepository.listByCliente(clienteId);
    const found = rows.find((row) => String(row.id) === String(id));
    return found ? mapRow(found) : { ...payload, id: String(id) };
}

async function removeClienteCombo(clienteId, comboId) {
    await clienteComboRepository.ensureTable();
    const ok = await clienteComboRepository.deleteByIdAndCliente(comboId, clienteId);
    if (!ok) {
        throw new AppError('Combo no encontrado', 404, 'COMBO_NOT_FOUND');
    }
}

module.exports = {
    listClienteCombos,
    createClienteCombo,
    removeClienteCombo,
};
