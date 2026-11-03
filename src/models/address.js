const { number } = require('joi');
const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({

    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient_name: {
        type: String,
        required: true
    },
    shipping_address: {
        type: String
    },
    state: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    postal_code: {
        type: String,
        required: true
    },
    country: {
        type :String,
        required: true
    },
    country_code: {
        type: String,
        required: true
    },
    full_address:{
        type: String
    }
  

    



    
},
{
    timestamps: true
}
)

exports.Address= mongoose.model('address', AddressSchema);