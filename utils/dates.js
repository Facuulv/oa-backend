function toISO(date = new Date()) {
    return new Date(date).toISOString();
}

function isExpired(dateString) {
    return new Date(dateString) < new Date();
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

module.exports = { toISO, isExpired, addDays };
