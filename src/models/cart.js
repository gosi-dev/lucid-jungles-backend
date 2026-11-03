const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    products:[{
        product: {type: mongoose.Schema.Types.ObjectId, ref: "products"},
        quantity: {type: Number, required: true},
        _id:false


    }]

    
},
{
    timestamps: true
}
)

exports.Cart = mongoose.model('cart', CartSchema);