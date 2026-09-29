import mongoose, { Document, Schema, Model } from 'mongoose';

export type ReservationStatus = 'CONFIRMADA' | 'CANCELADA';

export interface IReservation extends Document {
  laboratorioId: mongoose.Types.ObjectId;
  usuarioId: mongoose.Types.ObjectId;
  data: string; // 'YYYY-MM-DD'
  aula: number; // 1 a 6
  status: ReservationStatus;
  observacao?: string;
  finalidade?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

const reservationSchema = new Schema<IReservation>(
  {
    laboratorioId: {
      type: Schema.Types.ObjectId,
      ref: 'Lab',
      required: [true, 'Laboratório é obrigatório']
    },
    usuarioId: {
      type: Schema.Types.ObjectId,
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

// Índice composto único com filtro parcial para garantir concorrência no MongoDB
reservationSchema.index(
  { laboratorioId: 1, data: 1, aula: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'CONFIRMADA' }
  }
);

reservationSchema.index({ data: 1, status: 1 });
reservationSchema.index({ usuarioId: 1 });

export const Reservation: Model<IReservation> =
  mongoose.models.Reservation || mongoose.model<IReservation>('Reservation', reservationSchema);
