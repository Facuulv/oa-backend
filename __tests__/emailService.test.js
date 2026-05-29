const nodemailer = require('nodemailer');
const { AppError } = require('../middlewares/errorHandler');

jest.mock('nodemailer');
jest.mock('../services/emailConfigService', () => ({
    buildResetEmailContent: jest.fn(),
}));

const emailConfigService = require('../services/emailConfigService');

const GENERIC_MESSAGE =
    'No pudimos enviar el email de recuperación. Intentá nuevamente más tarde.';

const TECHNICAL_TERMS = ['Invalid login', 'SMTP', '535', 'BadCredentials'];

const requiredEnv = {
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: '587',
    SMTP_USER: 'user@test.com',
    SMTP_PASS: 'app-password',
    SMTP_FROM: 'user@test.com',
};

const sendMailMockRef = { current: null };

const loadEmailService = (sendMail = sendMailMockRef.current) => {
    jest.resetModules();
    const nodemailerFresh = require('nodemailer');
    nodemailerFresh.createTransport.mockReturnValue({ sendMail });

    const emailConfig = require('../services/emailConfigService');
    emailConfig.buildResetEmailContent.mockResolvedValue({
        from: '"OA!" <user@test.com>',
        subject: 'Recuperación',
        text: 'texto',
        html: '<p>html</p>',
    });

    return require('../services/emailService');
};

describe('emailService', () => {
    let sendMailMock;
    const originalEnv = {};

    beforeEach(() => {
        sendMailMock = jest.fn().mockResolvedValue({ messageId: 'test-id' });
        sendMailMockRef.current = sendMailMock;
        nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

        emailConfigService.buildResetEmailContent.mockResolvedValue({
            from: '"OA!" <user@test.com>',
            subject: 'Recuperación',
            text: 'texto',
            html: '<p>html</p>',
        });

        for (const key of Object.keys(requiredEnv)) {
            originalEnv[key] = process.env[key];
            process.env[key] = requiredEnv[key];
        }
    });

    afterEach(() => {
        for (const key of Object.keys(requiredEnv)) {
            if (originalEnv[key] === undefined) delete process.env[key];
            else process.env[key] = originalEnv[key];
        }
        jest.clearAllMocks();
    });

    test('SMTP faltante lanza EMAIL_CONFIG_ERROR con mensaje genérico', async () => {
        delete process.env.SMTP_PASS;
        const { sendResetPasswordEmail } = loadEmailService();

        await expect(
            sendResetPasswordEmail({
                to: 'cliente@test.com',
                nombre: 'Cliente',
                resetUrl: 'https://example.com/reset?token=abc',
            }),
        ).rejects.toMatchObject({
            message: GENERIC_MESSAGE,
            code: 'EMAIL_CONFIG_ERROR',
            statusCode: 500,
            isOperational: true,
        });

        for (const term of TECHNICAL_TERMS) {
            try {
                await sendResetPasswordEmail({
                    to: 'cliente@test.com',
                    nombre: 'Cliente',
                    resetUrl: 'https://example.com/reset?token=abc',
                });
            } catch (error) {
                expect(error.message).not.toContain(term);
            }
        }
    });

    test('sendMail con EAUTH lanza EMAIL_SEND_FAILED con mensaje genérico', async () => {
        const smtpError = Object.assign(new Error('Invalid login: 535-5.7.8 Username and Password not accepted'), {
            code: 'EAUTH',
            command: 'AUTH PLAIN',
        });
        sendMailMock.mockRejectedValue(smtpError);

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { sendResetPasswordEmail } = loadEmailService();

        await expect(
            sendResetPasswordEmail({
                to: 'cliente@test.com',
                nombre: 'Cliente',
                resetUrl: 'https://example.com/reset?token=abc',
            }),
        ).rejects.toMatchObject({
            message: GENERIC_MESSAGE,
            code: 'EMAIL_SEND_FAILED',
            statusCode: 500,
            isOperational: true,
        });

        try {
            await sendResetPasswordEmail({
                to: 'cliente@test.com',
                nombre: 'Cliente',
                resetUrl: 'https://example.com/reset?token=abc',
            });
        } catch (error) {
            for (const term of TECHNICAL_TERMS) {
                expect(error.message).not.toContain(term);
            }
        }

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            '[forgot-password] Error al enviar email de recuperación:',
            smtpError,
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            '[forgot-password] Error de autenticación SMTP. Revisar SMTP_USER / SMTP_PASS / contraseña de aplicación.',
        );

        consoleErrorSpy.mockRestore();
    });

    test('sendMail exitoso no lanza error', async () => {
        const { sendResetPasswordEmail } = loadEmailService();

        await expect(
            sendResetPasswordEmail({
                to: 'cliente@test.com',
                nombre: 'Cliente',
                resetUrl: 'https://example.com/reset?token=abc',
            }),
        ).resolves.toBeUndefined();

        expect(sendMailMock).toHaveBeenCalledTimes(1);
    });
});

describe('globalErrorHandler con AppError operacional', () => {
    const { globalErrorHandler } = require('../middlewares/errorHandler');

    test('devuelve mensaje y code de AppError operacional en producción', () => {
        const originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const res = {
            statusCode: null,
            body: null,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(payload) {
                this.body = payload;
                return this;
            },
        };

        const err = new AppError(GENERIC_MESSAGE, 500, 'EMAIL_SEND_FAILED');
        globalErrorHandler(err, { originalUrl: '/auth/forgot-password' }, res, () => {});

        expect(res.statusCode).toBe(500);
        expect(res.body).toMatchObject({
            error: GENERIC_MESSAGE,
            code: 'EMAIL_SEND_FAILED',
        });
        expect(res.body.errors).toBeUndefined();

        process.env.NODE_ENV = originalNodeEnv;
    });
});
