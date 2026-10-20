import {prisma} from "../../config/db.js"
import { Stripe } from "stripe";
import { AppError } from "../../utils/AppError.js"
import {stripe} from "../../config/stripe.js"
import { Cache } from "../../utils/cache.js";
interface userData{
    id:string
    role:string
}

export const createCheckoutSessionService=async(bookingId:string,user:userData): Promise<Stripe.Checkout.Session>=>{
    const booking = await prisma.booking.findFirst({
        where:{
            id:bookingId,
            userId:user.id,
            status:'PENDING'
        },
        include:{
            room:{
                include:{
                    roomType:true
                }
            }
        }
    });

    if(!booking){
        throw new AppError("booking not found",404)
    }

        const session = await stripe.checkout.sessions.create({
        payment_method_types:["card"],
        mode:"payment",
        success_url:`${process.env.FRONTEND_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/booking/cancel`,
        client_reference_id: booking.id,
        line_items:[{
            price_data:{
                currency: "usd",
                product_data:{
                    name: `Room Booking - ${booking.room.roomType.title}`,
                },
                unit_amount: Math.round(booking.totalPrice * 100),
            },
            quantity: 1,
        }],
    });
    return session;

}

export const handleWebhookService = async (body: Buffer,signature: string) => {
    let event: Stripe.Event;
    try{

        event = stripe.webhooks.constructEvent(body,signature,process.env.STRIPE_WEBHOOK_SECRET as string)
    }catch (err: any) {
        throw new AppError(`Webhook Error: ${err.message}`, 400);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.client_reference_id;

        if (bookingId && session.payment_status === "paid") {
            const { count } = await prisma.booking.updateMany({
                where: { id: bookingId, status: "PENDING" },
                data: { status: "CONFIRMED" },
            });

            if (count > 0) {
                const booking = await prisma.booking.findUnique({
                    where: { id: bookingId },
                    include: { room: { include: { roomType: true } } },
                });
                if (booking) {
                    await Promise.all([
                        Cache.del(`booking:${booking.id}`),
                        Cache.del(`user:bookings:${booking.userId}`),
                        Cache.delPattern(`rooms:roomType:${booking.room.roomTypeId}:*`),
                        Cache.delPattern(`roomTypes:hotel:${booking.room.roomType.hotelId}:*`),
                    ]);
                }
            }
            
        }
    }
  
    return { received: true };
}









