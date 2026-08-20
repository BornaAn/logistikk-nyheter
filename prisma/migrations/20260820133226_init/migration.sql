-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "articleUrl" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawExcerpt" TEXT,
    "aiSummary" TEXT,
    "category" TEXT,
    "accessLevel" TEXT NOT NULL DEFAULT 'full',
    "summaryStatus" TEXT NOT NULL DEFAULT 'pending',
    "summaryError" TEXT,
    "summarizedAt" DATETIME,
    "createdAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FetchLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourcesOk" INTEGER NOT NULL,
    "sourcesFailed" INTEGER NOT NULL,
    "articlesFound" INTEGER NOT NULL,
    "articlesNew" INTEGER NOT NULL,
    "summariesOk" INTEGER NOT NULL,
    "summariesFailed" INTEGER NOT NULL,
    "errors" TEXT
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
