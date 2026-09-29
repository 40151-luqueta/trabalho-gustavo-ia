import mongoose, { Document, Schema, Model } from 'mongoose';

export type RuleType = 'RECORRENTE' | 'PERIODO';

export interface IReservationRule extends Document {
  professorId: mongoose.Types.ObjectId;
  nome: string;
  tipo: RuleType;
  diasSemana: number[]; // 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex
  semanas?: number[];   // Semanas do mês (1 a 5) caso a regra seja por semana
  dataInicio?: Date;
  dataFim?: Date;
  laboratoriosPermitidos?: mongoose.Types.ObjectId[];
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

const reservationRuleSchema = new Schema<IReservationRule>(
  {
    professorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Professor é obrigatório']
    },
    nome: {
      type: String,
      required: [true, 'Nome descritivo da regra é obrigatório'],
      trim: true
    },
    tipo: {
      type: String,
      enum: {
        values: ['RECORRENTE', 'PERIODO'],
        message: '{VALUE} não é um tipo de regra válido'
      },
      default: 'RECORRENTE'
    },
    diasSemana: {
      type: [Number],
      required: [true, 'Pelo menos um dia da semana deve ser informado'],
      validate: {
        validator: function (v: number[]) {
          return Array.isArray(v) && v.length > 0 && v.every((d) => d >= 1 && d <= 7);
        },
        message: 'Dias da semana devem estar entre 1 (Segunda) e 7 (Domingo)'
      }
    },
    semanas: {
      type: [Number],
      default: []
    },
    dataInicio: {
      type: Date
    },
    dataFim: {
      type: Date
    },
    laboratoriosPermitidos: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Lab'
      }
    ],
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

reservationRuleSchema.index({ professorId: 1, ativo: 1 });

export const ReservationRule: Model<IReservationRule> =
  mongoose.models.ReservationRule || mongoose.model<IReservationRule>('ReservationRule', reservationRuleSchema);
