-- CreateTable
CREATE TABLE "ArticleSector" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "sectorSlug" TEXT NOT NULL,

    CONSTRAINT "ArticleSector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleSector_sectorSlug_idx" ON "ArticleSector"("sectorSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleSector_articleId_sectorSlug_key" ON "ArticleSector"("articleId", "sectorSlug");

-- AddForeignKey
ALTER TABLE "ArticleSector" ADD CONSTRAINT "ArticleSector_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
