import {
  Controller, Post, Delete, Body, Param,
  Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus, Get,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UploadService }     from './upload.service';
import { TranscodingService } from '../transcoding/transcoding.service';
import { JwtAuthGuard }      from '../common/guards/jwt-auth.guard';
import { RolesGuard }        from '../common/guards/roles.guard';
import { Roles, Role }       from '../common/decorators/roles.decorator';
import { CurrentUser }       from '../common/decorators/current-user.decorator';
import { IsString, IsNumber, IsInt, IsArray, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { Type }              from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class InitiateUploadBodyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() contentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() episodeId?: string;
  @ApiProperty() @IsString() filename: string;
  @ApiProperty() @Type(() => Number) @IsNumber() fileSize: number;
  @ApiProperty() @IsString() mimeType: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(1000) partCount: number;
}
class CompleteUploadBodyDto {
  @ApiProperty() @IsString() uploadId: string;
  @ApiProperty() @IsString() key: string;
  @ApiProperty() @IsString() videoAssetId: string;
  @ApiProperty() @IsArray()  parts: { PartNumber: number; ETag: string }[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoTranscode?: boolean;
}
class AbortUploadDto {
  @ApiProperty() @IsString() key: string;
  @ApiProperty() @IsString() uploadId: string;
}

@ApiTags('upload')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService:      UploadService,
    private readonly transcodingService: TranscodingService,
  ) {}

  @Post('initiate')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: '[Admin] Initiate multipart upload' })
  initiateUpload(@Body() dto: InitiateUploadBodyDto, @CurrentUser('id') userId: string) {
    return this.uploadService.initiateUpload(dto, userId);
  }

  @Post('complete')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: '[Admin] Complete upload and trigger transcoding' })
  completeUpload(@Body() dto: CompleteUploadBodyDto) {
    return this.uploadService.completeUpload(dto);
  }

  @Delete('abort')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  abortUpload(@Body() dto: AbortUploadDto) {
    return this.uploadService.abortUpload(dto.key, dto.uploadId);
  }

  @Get('presign')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  getPresignedUrl(@Query('contentId') cid: string, @Query('filename') fn: string, @Query('mimeType') mt: string) {
    return this.uploadService.getPresignedPutUrl(cid, fn, mt);
  }

  @Get('status/:videoAssetId')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  getStatus(@Param('videoAssetId', ParseUUIDPipe) videoAssetId: string) {
    return this.transcodingService.getJobStatus(videoAssetId);
  }

  @Post('retry/:videoAssetId')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  retryJob(@Param('videoAssetId', ParseUUIDPipe) videoAssetId: string) {
    return this.transcodingService.retryJob(videoAssetId);
  }

  @Get('jobs')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  listJobs(@Query('status') status?: string, @Query('limit') limit = 50) {
    return this.transcodingService.listJobs(status, Number(limit));
  }

  @Get('queue-stats')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  queueStats() { return this.transcodingService.getQueueStats(); }
}
