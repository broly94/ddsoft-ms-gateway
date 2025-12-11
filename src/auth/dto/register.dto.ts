import { UserRole } from '@/common/users/roles';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
} from 'class-validator';

// DTO para el registro de nuevos usuarios
export class RegisterDto {
  @IsEmail({}, { message: 'El email debe ser una dirección de correo válida.' })
  @MaxLength(255, { message: 'El email no debe exceder los 255 caracteres.' })
  email: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'El rol de usuario no es válido.' })
  role?: UserRole;
}
