-- CreateTable
CREATE TABLE "ArticleConcept" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "conceptSlug" TEXT NOT NULL,
    "whyRelevant" TEXT NOT NULL,

    CONSTRAINT "ArticleConcept_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleConcept_conceptSlug_idx" ON "ArticleConcept"("conceptSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleConcept_articleId_conceptSlug_key" ON "ArticleConcept"("articleId", "conceptSlug");

-- AddForeignKey
ALTER TABLE "ArticleConcept" ADD CONSTRAINT "ArticleConcept_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
