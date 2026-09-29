import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ILab extends Document {
  codigo: string;
  nome: string;
  descricao: string;
  capacidade: number;
  localizacao: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

const labSchema = new Schema<ILab>(
  {
    codigo: {
      type: String,
      required: [true, 'Código do laboratório é obrigatório'],
      unique: true,
      trim: true,
      lowercase: true
    },
    nome: {
      type: String,
      required: [true, 'Nome do laboratório é obrigatório'],
      trim: true
    },
    descricao: {
      type: String,
      default: '',
      trim: true
    },
    capacidade: {
      type: Number,
      required: [true, 'Capacidade é obrigatória'],
      min: [1, 'Capacidade deve ser no mínimo 1']
    },
    localizacao: {
      type: String,
      default: '',
      trim: true
    },
    ativo: {
      type: Boolean,
      default: true
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

export const Lab: Model<ILab> = mongoose.models.Lab || mongoose.model<ILab>('Lab', labSchema);
