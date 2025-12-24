import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FileCleanupService } from '@/cron/file-cleanup.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [FileCleanupService],
})
export class CronModule {}
