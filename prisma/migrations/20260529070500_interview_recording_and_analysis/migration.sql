-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "answersJson" JSONB,
ADD COLUMN     "recordingUrl" TEXT;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "answerAnalysis" JSONB,
ADD COLUMN     "grammarFeedback" TEXT[];
