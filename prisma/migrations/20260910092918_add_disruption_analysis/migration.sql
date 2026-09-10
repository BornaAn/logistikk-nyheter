-- CreateTable
CREATE TABLE "DisruptionAnalysis" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisruptionAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DisruptionAnalysis_articleId_key" ON "DisruptionAnalysis"("articleId");

-- AddForeignKey
ALTER TABLE "DisruptionAnalysis" ADD CONSTRAINT "DisruptionAnalysis_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
