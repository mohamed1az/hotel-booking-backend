/*
  Warnings:

  - A unique constraint covering the columns `[name,address]` on the table `Hotel` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Hotel_name_address_key" ON "Hotel"("name", "address");
