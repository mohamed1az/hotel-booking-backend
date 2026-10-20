/*
  Warnings:

  - A unique constraint covering the columns `[hotelId,title]` on the table `RoomType` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "RoomType_hotelId_title_key" ON "RoomType"("hotelId", "title");
