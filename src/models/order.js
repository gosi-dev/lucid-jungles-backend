const { number, date } = require('joi');
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    order_id:{

      type: String  
    },
    store:{
        type: mongoose.Schema.Types.ObjectId, ref: 'store', required: true

    },

    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    products: [{
        product: {type: mongoose.Schema.Types.ObjectId, ref: "products"},
        quantity: {type: Number, required: true},
        _id:false


    }],
    order_date:{
        type: String

    },

    shippingDetails:{
        type: mongoose.Schema.Types.ObjectId, ref: "address"
    },
    total_amount:{
        type: Number
    },
    shipping_fee:{
        type: Number 
    },
    

    payment_method: {type: String, enum:["Tokens", "Card", "Direct Transfer"]},
    tx_ref:{type: String},
    status: {type: String, enum:["Pending","In Progress", "Shipped", "Received","In Transit", "Cancelled"], default: "Pending"}
    



    
},
{
    timestamps: true
}
)

exports.Order = mongoose.model('order', OrderSchema);