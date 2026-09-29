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
exports.SystemSettings = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const lessonSchema = new mongoose_1.Schema({
    numero: { type: Number, required: true },
    nome: { type: String, required: true },
    horarioInicio: { type: String, required: true },
    horarioFim: { type: String, required: true }
}, { _id: false });
const systemSettingsSchema = new mongoose_1.Schema({
    singletonKey: {
        type: String,
        default: 'SYSTEM_SETTINGS_SINGLETON',
        unique: true
    },
    reservationWindowWeeks: {
        type: Number,
        default: 4,
        min: [1, 'A janela de reserva deve ser de pelo menos 1 semana'],
        max: [52, 'A janela máxima permitida é de 52 semanas']
    },
    exceptionAdvanceDays: {
        type: Number,
        default: 1,
        min: [0, 'Antecedência excepcional deve ser no mínimo 0 dias'],
        max: [30, 'Antecedência máxima excepcional é de 30 dias']
    },
    lessons: {
        type: [lessonSchema],
        default: [
            { numero: 1, nome: 'Aula 1', horarioInicio: '07:00', horarioFim: '07:50' },
            { numero: 2, nome: 'Aula 2', horarioInicio: '07:50', horarioFim: '08:40' },
            { numero: 3, nome: 'Aula 3', horarioInicio: '08:55', horarioFim: '09:45' },
            { numero: 4, nome: 'Aula 4', horarioInicio: '09:45', horarioFim: '10:35' },
            { numero: 5, nome: 'Aula 5', horarioInicio: '10:50', horarioFim: '11:40' },
            { numero: 6, nome: 'Aula 6', horarioInicio: '11:40', horarioFim: '12:30' }
        ]
    },
    schoolDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5] // 1: Seg, 2: Ter, 3: Qua, 4: Qui, 5: Sex
    },
    timezone: {
        type: String,
        default: 'America/Sao_Paulo'
    }
}, {
    timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' },
    toJSON: {
        transform(_doc, ret) {
            ret.id = ret._id ? ret._id.toString() : undefined;
            delete ret._id;
            delete ret.singletonKey;
            delete ret.__v;
            return ret;
        }
    }
});
systemSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne({ singletonKey: 'SYSTEM_SETTINGS_SINGLETON' });
    if (!settings) {
        settings = await this.create({ singletonKey: 'SYSTEM_SETTINGS_SINGLETON' });
    }
    return settings;
};
exports.SystemSettings = mongoose_1.default.models.SystemSettings ||
    mongoose_1.default.model('SystemSettings', systemSettingsSchema);
