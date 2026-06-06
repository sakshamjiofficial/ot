import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  IsUUID,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UploadContentType {
  MOVIE   = 'movie',
  EPISODE = 'episode',
}

// Step 1 — client asks for presigned upload URL
export class InitiateUploadDto {
  @ApiProperty({ example: 'movie' })
  @IsEnum(UploadContentType)
  contentType: UploadContentType;

  @ApiPropertyOptional({ description: 'content.id for movie or series' })
  @IsOptional()
  @IsUUID()
  contentId?: string;

  @ApiPropertyOptional({ description: 'episode.id for episode upload' })
  @IsOptional()
  @IsUUID()
  episodeId?: string;

  @ApiProperty({ example: 'BigBuckBunny.mp4' })
  @IsString()
  filename: string;

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  mimeType: string;

  @ApiProperty({ example: 4294967296, description: 'File size in bytes' })
  @IsNumber()
  @Min(1)
  fileSize: number;

  @ApiPropertyOptional({ default: 1, description: 'Transcoding priority 1 (highest) – 10 (lowest)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number = 5;
}

// Step 2 — request presigned URLs for each multipart part
export class GetMultipartPartsDto {
  @ApiProperty()
  @IsString()
  uploadId: string;      // R2 multipart upload ID

  @ApiProperty()
  @IsString()
  key: string;           // R2 object key

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  @Max(10000)
  totalParts: number;
}

// Step 3 — confirm all parts uploaded, trigger transcoding
export class CompletedPartDto {
  @ApiProperty()
  @IsInt()
  partNumber: number;

  @ApiProperty()
  @IsString()
  etag: string;
}

export class CompleteUploadDto {
  @ApiProperty()
  @IsString()
  uploadId: string;

  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  videoAssetId: string;

  @ApiProperty({ type: [CompletedPartDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompletedPartDto)
  parts: CompletedPartDto[];
}

// Abort upload
export class AbortUploadDto {
  @ApiProperty()
  @IsString()
  uploadId: string;

  @ApiProperty()
  @IsString()
  key: string;
}
