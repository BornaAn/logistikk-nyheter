-- CreateTable
CREATE TABLE "DailyQuiz" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyQuiz_pkey" PRIMARY KEY ("key")
);
