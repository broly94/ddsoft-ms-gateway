import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class ProcessImageAndSearchDto {
  @IsString()
  @IsOptional()
  company?: string;
}

export class ProcessCatalogImageDto extends ProcessImageAndSearchDto {
  // Puedes añadir más campos si son necesarios para este DTO específico
}
