const db = require('../config/database');

const findAll = async () => {
    const [rows] = await db.execute(
        `SELECT id, dia_semana, hora_apertura, hora_cierre, activo, orden,
                fecha_creacion, fecha_modificacion
         FROM horarios_tienda
         ORDER BY dia_semana ASC, orden ASC`,
    );
    return rows;
};

const replaceDay = async (diaSemana, franjas) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute('DELETE FROM horarios_tienda WHERE dia_semana = ?', [diaSemana]);

        let orden = 0;
        for (const franja of franjas) {
            if (!franja?.activo) continue;
            await connection.execute(
                `INSERT INTO horarios_tienda (dia_semana, hora_apertura, hora_cierre, activo, orden)
                 VALUES (?, ?, ?, 1, ?)`,
                [diaSemana, franja.hora_apertura, franja.hora_cierre, orden],
            );
            orden += 1;
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    findAll,
    replaceDay,
};
