-- CreateTable
CREATE TABLE "PensumFeedCache" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,

    CONSTRAINT "PensumFeedCache_pkey" PRIMARY KEY ("id")
);
