-- Texto introductorio opcional del correo de recuperación de contraseña

INSERT INTO configuracion_sistema (clave, valor)
SELECT 'EMAIL_RECUPERACION_TEXTO_INTRO',
    'Recibimos una solicitud para restablecer tu contraseña. Usá el enlace de abajo para continuar.'
WHERE NOT EXISTS (
    SELECT 1 FROM configuracion_sistema WHERE clave = 'EMAIL_RECUPERACION_TEXTO_INTRO'
);
