-- CreateEnum
CREATE TYPE "Category" AS ENUM ('shipping', 'trucking', 'lager_forsyningskjede', 'norge', 'globalt_geopolitikk');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('full', 'limited');

-- CreateEnum
CREATE TYPE "SummaryStatus" AS ENUM ('pending', 'done', 'failed');

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "articleUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawExcerpt" TEXT,
    "aiSummary" TEXT,
    "category" "Category",
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'full',
    "summaryStatus" "SummaryStatus" NOT NULL DEFAULT 'pending',
    "summaryError" TEXT,
    "summarizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FetchLog" (
    "id" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourcesOk" INTEGER NOT NULL,
    "sourcesFailed" INTEGER NOT NULL,
    "articlesFound" INTEGER NOT NULL,
    "articlesNew" INTEGER NOT NULL,
    "summariesOk" INTEGER NOT NULL,
    "summariesFailed" INTEGER NOT NULL,
    "errors" TEXT,

    CONSTRAINT "FetchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_articleUrl_key" ON "Article"("articleUrl");

-- CreateIndex
CREATE INDEX "Article_publishedAt_idx" ON "Article"("publishedAt");

-- CreateIndex
CREATE INDEX "Article_category_idx" ON "Article"("category");

-- CreateIndex
CREATE INDEX "Article_sourceName_idx" ON "Article"("sourceName");

-- CreateIndex
CREATE INDEX "Article_summaryStatus_idx" ON "Article"("summaryStatus");
