-- CreateIndex
CREATE INDEX "Booking_roomId_status_checkIn_checkOut_idx" ON "Booking"("roomId", "status", "checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "Hotel_name_idx" ON "Hotel"("name");

-- CreateIndex
CREATE INDEX "Hotel_address_idx" ON "Hotel"("address");

-- CreateIndex
CREATE INDEX "Room_roomTypeId_isAvailable_idx" ON "Room"("roomTypeId", "isAvailable");

-- CreateIndex
CREATE INDEX "RoomType_hotelId_idx" ON "RoomType"("hotelId");
