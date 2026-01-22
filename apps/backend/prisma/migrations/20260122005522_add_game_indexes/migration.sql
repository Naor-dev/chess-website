-- CreateIndex
CREATE INDEX "games_user_id_idx" ON "games"("user_id");

-- CreateIndex
CREATE INDEX "games_status_idx" ON "games"("status");

-- CreateIndex
CREATE INDEX "games_user_id_status_idx" ON "games"("user_id", "status");

-- CreateIndex
CREATE INDEX "games_updated_at_idx" ON "games"("updated_at");
