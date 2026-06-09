import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('apk')
@Controller('download-apk')
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Download latest Android APK' })
  downloadApk(@Res() res: Response) {
    const apkPath = '/workspaces/Kaler/ott-platform/android/app/build/outputs/apk/debug/app-debug.apk';
    if (!existsSync(apkPath)) {
      res.status(404).send('APK file not found. Please build the Android app first.');
      return;
    }
    res.set({
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="app-debug.apk"',
    });
    const file = createReadStream(apkPath);
    file.pipe(res);
  }
}
