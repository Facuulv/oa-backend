const nodemailer = require('nodemailer');
const { AppError } = require('../middlewares/errorHandler');

let transporter;

const requiredKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];

const getMailConfig = () => {
    const missing = requiredKeys.filter((key) => !String(process.env[key] || '').trim());
    if (missing.length > 0) {
        throw new AppError(
            'Servicio de correo no configurado',
            500,
            'EMAIL_CONFIG_ERROR',
            { missing },
        );
    }

    const port = Number(process.env.SMTP_PORT);
    if (!Number.isFinite(port) || port <= 0) {
        throw new AppError('Servicio de correo no configurado', 500, 'EMAIL_CONFIG_ERROR');
    }

    return {
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        from: process.env.SMTP_FROM,
    };
};

const getTransporter = () => {
    if (transporter) return transporter;
    const cfg = getMailConfig();
    transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: cfg.auth,
    });
    return transporter;
};

const sendResetPasswordEmail = async ({ to, nombre, resetUrl }) => {
    const cfg = getMailConfig();
    const mailer = getTransporter();
    const firstName = String(nombre || '').trim() || 'cliente';

    await mailer.sendMail({
        from: cfg.from,
        to,
        subject: 'OA! - Recuperación de contraseña',
        text: `Hola ${firstName},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nUsá este enlace para continuar:\n${resetUrl}\n\nEl enlace vence en 1 hora. Si no solicitaste este cambio, podés ignorar este mensaje.\n`,
        html: `
            <p>Hola ${firstName},</p>
            <p>Recibimos una solicitud para restablecer tu contraseña.</p>
            <p><a href="${resetUrl}">Restablecer contraseña</a></p>
            <p>Este enlace vence en 1 hora. Si no solicitaste este cambio, podés ignorar este mensaje.</p>
        `,
    });
};

module.exports = {
    sendResetPasswordEmail,
};
