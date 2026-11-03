const mongoose = require('mongoose');

const ticketPurchaseSchema = new mongoose.Schema({
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    eventId:    { type: mongoose.Schema.Types.ObjectId, ref: 'event', required: true },
    ticketName: { type: String, required: true },
    quantity:   { type: Number, required: true },
    totalPaid:  { type: Number, required: true },
    currency:   { type: String, default: 'USD' },
    paymentRef: { type: String },    // Flutterwave tx_ref
    status:     { type: String, enum: ['pending', 'confirmed', 'refunded'], default: 'pending' }
},
{ timestamps: true });

exports.TicketPurchase = mongoose.model('ticketPurchase', ticketPurchaseSchema);
