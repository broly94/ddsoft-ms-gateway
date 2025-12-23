import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);
  private readonly uploadsDir = path.join(process.cwd(), 'temp_uploads');
  private readonly MAX_AGE_HOURS = 2;

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Running scheduled cleanup for temp_uploads directory...');

    try {
      const files = await fs.readdir(this.uploadsDir);

      for (const file of files) {
        const filePath = path.join(this.uploadsDir, file);

        try {
          const stats = await fs.stat(filePath);
          const now = new Date().getTime();
          const fileAgeHours =
            (now - stats.birthtime.getTime()) / (1000 * 60 * 60);

          if (fileAgeHours > this.MAX_AGE_HOURS) {
            await fs.unlink(filePath);
            this.logger.log(`Deleted old file: ${file}`);
          }
        } catch (err) {
          this.logger.error(`Error processing file: ${file}`, err);
        }
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        this.logger.warn(
          `Directory not found, skipping cleanup: ${this.uploadsDir}`,
        );
      } else {
        this.logger.error('Error reading uploads directory', err);
      }
    }
  }
}
