const nodemailer = require('nodemailer');
const { AppError } = require('../middlewares/errorHandler');
const emailConfigService = require('./emailConfigService');

let transporter;

const requiredKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];

const FORGOT_PASSWORD_EMAIL_ERROR_MESSAGE =
    'No pudimos enviar el email de recuperación. Intentá nuevamente más tarde.';

const getMailTransportConfig = () => {
    const missing = requiredKeys.filter((key) => !String(process.env[key] || '').trim());
    if (missing.length > 0) {
        console.error('[email] Variables SMTP faltantes:', missing.join(', '));
        throw new AppError(
            FORGOT_PASSWORD_EMAIL_ERROR_MESSAGE,
            500,
            'EMAIL_CONFIG_ERROR',
        );
    }

    const port = Number(process.env.SMTP_PORT);
    if (!Number.isFinite(port) || port <= 0) {
        console.error('[email] SMTP_PORT inválido:', process.env.SMTP_PORT);
        throw new AppError(FORGOT_PASSWORD_EMAIL_ERROR_MESSAGE, 500, 'EMAIL_CONFIG_ERROR');
    }

    return {
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    };
};

const getTransporter = () => {
    if (transporter) return transporter;
    const cfg = getMailTransportConfig();
    transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: cfg.auth,
    });
    return transporter;
};

const sendResetPasswordEmail = async ({ to, nombre, resetUrl }) => {
    const mailer = getTransporter();
    const content = await emailConfigService.buildResetEmailContent({ nombre, resetUrl });

    if (!content.from) {
        console.error('[email] SMTP_FROM no configurado o encabezado From inválido');
        throw new AppError(FORGOT_PASSWORD_EMAIL_ERROR_MESSAGE, 500, 'EMAIL_CONFIG_ERROR');
    }

    try {
        await mailer.sendMail({
            from: content.from,
            to,
            subject: content.subject,
            text: content.text,
            html: content.html,
        });
    } catch (error) {
        console.error('[forgot-password] Error al enviar email de recuperación:', error);
        if (error && error.code === 'EAUTH') {
            console.error(
                '[forgot-password] Error de autenticación SMTP. Revisar SMTP_USER / SMTP_PASS / contraseña de aplicación.',
            );
        }
        throw new AppError(
            FORGOT_PASSWORD_EMAIL_ERROR_MESSAGE,
            500,
            'EMAIL_SEND_FAILED',
        );
    }
};

module.exports = {
    sendResetPasswordEmail,
    FORGOT_PASSWORD_EMAIL_ERROR_MESSAGE,
};
