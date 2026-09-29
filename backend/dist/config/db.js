"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
exports.disconnectDB = disconnectDB;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
let cached = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
    global.mongooseCache = cached;
}
async function connectDB(uri) {
    const mongoUri = uri || process.env.MONGODB_URI || env_1.config.mongodbUri;
    if (mongoose_1.default.connection.readyState === 1) {
        cached.conn = mongoose_1.default;
        return mongoose_1.default;
    }
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
        };
        cached.promise = mongoose_1.default.connect(mongoUri, opts).then((m) => {
            console.log(`[MongoDB] Conectado com sucesso em: ${mongoUri.split('@').pop()}`);
            return m;
        });
    }
    try {
        cached.conn = await cached.promise;
    }
    catch (e) {
        cached.promise = null;
        throw e;
    }
    return cached.conn;
}
async function disconnectDB() {
    if (cached.conn) {
        await mongoose_1.default.disconnect();
        cached.conn = null;
        cached.promise = null;
    }
}
