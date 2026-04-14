require('dotenv').config();
require('./config/jwt');

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const { notFoundHandler, globalErrorHandler } = require('./middlewares/errorHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const usersRoutes = require('./routes/usersRoutes');
const categoriesRoutes = require('./routes/categoriesRoutes');
const productsRoutes = require('./routes/productsRoutes');
const promotionsRoutes = require('./routes/promotionsRoutes');
const couponsRoutes = require('./routes/couponsRoutes');
const ordersRoutes = require('./routes/ordersRoutes');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const healthRoutes = require('./routes/healthRoutes');

// App
const app = express();
const port = process.env.PORT || 4000;

// CORS
const allowedOrigins = ['http://localhost:3000'];

if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);

if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').forEach((o) => {
        const trimmed = o.trim();
        if (trimmed) allowedOrigins.push(trimmed);
    });
}

if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push(/^http:\/\/localhost:\d+$/);
    allowedOrigins.push(/^http:\/\/127\.0\.0\.1:\d+$/);
}

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = allowedOrigins.some((o) =>
            typeof o === 'string' ? o === origin : o.test(origin),
        );
        if (allowed) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200,
};

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Mount routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/categories', categoriesRoutes);
app.use('/products', productsRoutes);
app.use('/promotions', promotionsRoutes);
app.use('/coupons', couponsRoutes);
app.use('/orders', ordersRoutes);
app.use('/public', publicRoutes);
app.use('/admin', adminRoutes);
app.use('/health', healthRoutes);

// Errors
app.use(notFoundHandler);
app.use(globalErrorHandler);

const server = app.listen(port, '0.0.0.0', () => {
    console.log('[oa-api] listening on port', port);
    console.log('[oa-api] env:', process.env.NODE_ENV || 'development');
});

const shutdown = (signal) => {
    console.log(`[oa-api] ${signal} received, shutting down`);
    server.close(() => {
        const db = require('./config/database');
        db.end().then(() => {
            console.log('[oa-api] server closed');
            process.exit(0);
        });
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
