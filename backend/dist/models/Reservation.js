"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reservation = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const reservationSchema = new mongoose_1.Schema({
    laboratorioId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Lab',
        required: [true, 'Laboratório é obrigatório']
    },
    usuarioId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Usuário é obrigatório']
    },
    data: {
        type: String,
        required: [true, 'Data é obrigatória (formato YYYY-MM-DD)'],
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido, use YYYY-MM-DD']
    },
    aula: {
        type: Number,
        required: [true, 'Aula é obrigatória'],
        min: [1, 'Aula mínima é 1'],
        max: [6, 'Aula máxima é 6']
    },
    status: {
        type: String,
        enum: {
            values: ['CONFIRMADA', 'CANCELADA'],
            message: '{VALUE} não é um status válido de reserva'
        },
        default: 'CONFIRMADA'
    },
    observacao: {
        type: String,
        default: '',
        trim: true
    },
    finalidade: {
        type: String,
        default: '',
        trim: true
    }
}, {
    timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' },
    toJSON: {
        transform(_doc, ret) {
            ret.id = ret._id ? ret._id.toString() : undefined;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});
// Índice composto único com filtro parcial para garantir concorrência no MongoDB
reservationSchema.index({ laboratorioId: 1, data: 1, aula: 1 }, {
    unique: true,
    partialFilterExpression: { status: 'CONFIRMADA' }
});
reservationSchema.index({ data: 1, status: 1 });
reservationSchema.index({ usuarioId: 1 });
exports.Reservation = mongoose_1.default.models.Reservation || mongoose_1.default.model('Reservation', reservationSchema);
