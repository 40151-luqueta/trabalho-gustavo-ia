import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'ALUNO' | 'PROFESSOR' | 'ADMIN';
export type UserStatus = 'PENDENTE' | 'ATIVO' | 'BLOQUEADO';

export interface IUser extends Document {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  status: UserStatus;
  criadoEm: Date;
  atualizadoEm: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    nome: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
      minlength: [2, 'Nome deve conter pelo menos 2 caracteres']
    },
    email: {
      type: String,
      required: [true, 'Email é obrigatório'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Por favor, informe um email válido']
    },
    senha: {
      type: String,
      required: [true, 'Senha é obrigatória'],
      minlength: [6, 'A senha deve conter pelo menos 6 caracteres']
    },
    role: {
      type: String,
      enum: {
        values: ['ALUNO', 'PROFESSOR', 'ADMIN'],
        message: '{VALUE} não é um papel válido'
      },
      default: 'ALUNO'
    },
    status: {
      type: String,
      enum: {
        values: ['PENDENTE', 'ATIVO', 'BLOQUEADO'],
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
        delete ret.senha;
        delete ret.__v;
        return ret;
      }
    }
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('senha')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.senha = await bcrypt.hash(this.senha, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.senha);
};

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
