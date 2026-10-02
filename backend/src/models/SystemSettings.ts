import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ILesson {
  numero: number;
  nome: string;
  horarioInicio: string;
  horarioFim: string;
}

export interface ISystemSettings extends Document {
  singletonKey: string;
  reservationWindowWeeks: number;
  exceptionAdvanceDays: number;
  lessons: ILesson[];
  schoolDays: number[];
  timezone: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ISystemSettingsModel extends Model<ISystemSettings> {
  getSettings(): Promise<ISystemSettings>;
}

const lessonSchema = new Schema<ILesson>(
  {
    numero: { type: Number, required: true },
    nome: { type: String, required: true },
    horarioInicio: { type: String, required: true },
    horarioFim: { type: String, required: true }
  },
  { _id: false }
);

export const DEFAULT_LESSONS: ILesson[] = [
  { numero: 1, nome: 'Aula 1', horarioInicio: '07:15', horarioFim: '08:05' },
  { numero: 2, nome: 'Aula 2', horarioInicio: '08:05', horarioFim: '08:55' },
  { numero: 3, nome: 'Aula 3', horarioInicio: '08:55', horarioFim: '09:45' },
  { numero: 4, nome: 'Aula 4', horarioInicio: '10:05', horarioFim: '10:55' },
  { numero: 5, nome: 'Aula 5', horarioInicio: '10:55', horarioFim: '11:45' },
  { numero: 6, nome: 'Aula 6', horarioInicio: '11:45', horarioFim: '12:35' }
];

const systemSettingsSchema = new Schema<ISystemSettings, ISystemSettingsModel>(
  {
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
      default: DEFAULT_LESSONS
    },
    schoolDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5] // 1: Seg, 2: Ter, 3: Qua, 4: Qui, 5: Sex
    },
    timezone: {
      type: String,
      default: 'America/Sao_Paulo'
    }
  },
  {
    timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' },
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret._id;
        delete ret.singletonKey;
        delete ret.__v;
        return ret;
      }
    }
  }
);

systemSettingsSchema.statics.getSettings = async function (): Promise<ISystemSettings> {
  let settings = await this.findOne({ singletonKey: 'SYSTEM_SETTINGS_SINGLETON' });
  if (!settings) {
    settings = await this.create({ singletonKey: 'SYSTEM_SETTINGS_SINGLETON' });
  }
  return settings;
};

export const SystemSettings: ISystemSettingsModel =
  (mongoose.models.SystemSettings as ISystemSettingsModel) ||
  mongoose.model<ISystemSettings, ISystemSettingsModel>('SystemSettings', systemSettingsSchema);
