const mysql = require('mysql2/promise');
require('dotenv').config();

class DatabaseManager {
    constructor() {
        this.pool = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;

        this.initializePool();
    }

    initializePool() {
        try {
            this.pool = mysql.createPool({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_DATABASE,
                port: process.env.DB_PORT || 3306,
                waitForConnections: true,
                connectionLimit: 10,
                maxIdle: 10,
                idleTimeout: 60000,
                queueLimit: 0,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0,
                charset: 'utf8mb4',
                timezone: 'local',
                multipleStatements: false,
                namedPlaceholders: false,
            });

            this.pool.on('connection', (connection) => {
                console.log(`[DB] Connection established (thread ${connection.threadId})`);
                this.isConnected = true;
                this.reconnectAttempts = 0;
            });

            this.pool.on('error', (err) => {
                console.error('[DB] Pool error:', err.message);
                this.isConnected = false;

                if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.fatal) {
                    this.handleReconnect();
                }
            });

            this.testConnection();
        } catch (error) {
            console.error('[DB] Pool initialization failed:', error.message);
            this.handleReconnect();
        }
    }

    async testConnection() {
        try {
            const connection = await this.pool.getConnection();
            await connection.ping();
            connection.release();
            console.log('[DB] Connection verified');
            this.isConnected = true;
            this.reconnectAttempts = 0;
        } catch (error) {
            console.error('[DB] Connection test failed:', error.message);
            this.isConnected = false;
            this.handleReconnect();
        }
    }

    async handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`[DB] Max reconnect attempts reached (${this.maxReconnectAttempts})`);
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;
        console.log(`[DB] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);

        setTimeout(() => this.initializePool(), delay);
    }

    async execute(query, params = []) {
        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                if (!this.pool) throw new Error('Database pool not initialized');
                const [results] = await this.pool.execute(query, params);
                return [results];
            } catch (error) {
                attempt++;
                const isConnectionError =
                    error.code === 'PROTOCOL_CONNECTION_LOST' ||
                    error.code === 'ECONNREFUSED' ||
                    error.fatal;

                if (isConnectionError && attempt < maxRetries) {
                    console.warn(`[DB] Query retry ${attempt}/${maxRetries}...`);
                    await new Promise((r) => setTimeout(r, 2000));
                    if (!this.isConnected) {
                        this.initializePool();
                        await new Promise((r) => setTimeout(r, 3000));
                    }
                    continue;
                }
                throw error;
            }
        }
    }

    async getConnection() {
        if (!this.pool) throw new Error('Database pool not initialized');
        return this.pool.getConnection();
    }

    async end() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.isConnected = false;
            console.log('[DB] Pool closed');
        }
    }

    getStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            poolExists: !!this.pool,
        };
    }
}

const db = new DatabaseManager();

module.exports = {
    execute: (query, params) => db.execute(query, params),
    getConnection: () => db.getConnection(),
    end: () => db.end(),
    getStatus: () => db.getStatus(),
};
