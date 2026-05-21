/** Límite de `pedidos.observaciones` (VARCHAR(500) en schema). */
const ORDER_OBSERVATIONS_MAX_LENGTH = 500;

/** Máximo de nombres de combo aceptados en el body (alineado con validator). */
const MAX_COMBO_LABELS = 10;

const ELLIPSIS = '…';

/**
 * Normaliza etiquetas de combo: trim, no vacías, sin duplicados (orden de primera aparición).
 * @param {unknown} comboLabels
 * @returns {string[]}
 */
function sanitizeComboLabels(comboLabels) {
    if (!Array.isArray(comboLabels) || comboLabels.length === 0) {
        return [];
    }
    const seen = new Set();
    const out = [];
    for (const raw of comboLabels) {
        const label = String(raw ?? '').trim();
        if (!label || seen.has(label)) {
            continue;
        }
        seen.add(label);
        out.push(label);
        if (out.length >= MAX_COMBO_LABELS) {
            break;
        }
    }
    return out;
}

/**
 * Texto de trazabilidad para combos personalizados.
 * @param {string[]} labels — ya sanitizados
 * @returns {string|null}
 */
function formatComboTraceLine(labels) {
    if (!labels.length) {
        return null;
    }
    if (labels.length === 1) {
        return `Combo personalizado: ${labels[0]}`;
    }
    return `Combos personalizados: ${labels.join(', ')}`;
}

/**
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
function truncateEnd(text, maxLen) {
    if (text.length <= maxLen) {
        return text;
    }
    if (maxLen <= ELLIPSIS.length) {
        return ELLIPSIS.slice(0, maxLen);
    }
    return `${text.slice(0, maxLen - ELLIPSIS.length)}${ELLIPSIS}`;
}

/**
 * Arma `pedidos.observaciones`: notas del cliente + trazabilidad de combos (si hay).
 * Prioridad al truncar: conservar notas del cliente; acortar la línea de combos.
 *
 * @param {string|null|undefined} customerNotes
 * @param {unknown} [comboLabels]
 * @returns {string|null}
 */
function buildOrderObservaciones(customerNotes, comboLabels) {
    const base =
        customerNotes != null && String(customerNotes).trim() !== ''
            ? String(customerNotes).trim()
            : '';

    const labels = sanitizeComboLabels(comboLabels);
    const trace = formatComboTraceLine(labels);

    if (!trace) {
        return base || null;
    }

    if (!base) {
        return truncateEnd(trace, ORDER_OBSERVATIONS_MAX_LENGTH);
    }

    const separator = '\n';
    const combined = `${base}${separator}${trace}`;
    if (combined.length <= ORDER_OBSERVATIONS_MAX_LENGTH) {
        return combined;
    }

    const reservedForBase = base.length + separator.length;
    const roomForTrace = ORDER_OBSERVATIONS_MAX_LENGTH - reservedForBase;

    if (roomForTrace <= ELLIPSIS.length) {
        return truncateEnd(base, ORDER_OBSERVATIONS_MAX_LENGTH);
    }

    return `${base}${separator}${truncateEnd(trace, roomForTrace)}`;
}

module.exports = {
    ORDER_OBSERVATIONS_MAX_LENGTH,
    MAX_COMBO_LABELS,
    sanitizeComboLabels,
    formatComboTraceLine,
    buildOrderObservaciones,
};
