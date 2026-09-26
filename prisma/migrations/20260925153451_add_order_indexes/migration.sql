-- CreateIndex
CREATE INDEX "orders_orderSessionId_idx" ON "orders"("orderSessionId");

-- CreateIndex
CREATE INDEX "orders_tableId_orderSessionId_idx" ON "orders"("tableId", "orderSessionId");
