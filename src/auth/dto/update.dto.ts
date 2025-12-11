import { UserRole } from '@/common/users/roles';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

// DTO para la actualización parcial de usuarios (solo datos administrativos)
export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'El email debe ser una dirección de correo válida.' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'El rol de usuario no es válido.' })
  role?: UserRole;

  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser un booleano.' })
  isActive?: boolean;
}
