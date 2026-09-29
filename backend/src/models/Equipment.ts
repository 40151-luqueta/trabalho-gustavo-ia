import mongoose, { Document, Schema, Model } from 'mongoose';

export type EquipmentStatus = 'ATIVO' | 'MANUTENCAO' | 'INATIVO';

export interface IEquipment extends Document {
  laboratorioId: mongoose.Types.ObjectId;
  nome: string;
  tipo: string;
  numeroPatrimonio: string;
  descricao: string;
  status: EquipmentStatus;
  criadoEm: Date;
  atualizadoEm: Date;
}

const equipmentSchema = new Schema<IEquipment>(
  {
    laboratorioId: {
      type: Schema.Types.ObjectId,
      ref: 'Lab',
      required: [true, 'Laboratório é obrigatório']
    },
    nome: {
      type: String,
      required: [true, 'Nome do equipamento é obrigatório'],
      trim: true
    },
    tipo: {
      type: String,
      required: [true, 'Tipo do equipamento é obrigatório'],
      trim: true
    },
    numeroPatrimonio: {
      type: String,
      default: '',
      trim: true
    },
    descricao: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ['ATIVO', 'MANUTENCAO', 'INATIVO'],
        message: '{VALUE} não é um status válido'
      },
      default: 'ATIVO'
    }
  },
  {
    timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' },
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

equipmentSchema.index({ laboratorioId: 1 });

export const Equipment: Model<IEquipment> =
  mongoose.models.Equipment || mongoose.model<IEquipment>('Equipment', equipmentSchema);
