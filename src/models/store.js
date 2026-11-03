const mongoose = require('mongoose');

const StoreSchema = new mongoose.Schema({
    name: {type: String, required: true},
    location: {type: String},
    products: [{type: mongoose.Schema.Types.ObjectId, ref: 'products'}],
    orders:[{
        type: mongoose.Schema.Types.ObjectId, ref: 'order'
    }],
    assets:{
        type: String
    }
    

    
},
{
    timestamps: true
}
)

exports.Store = mongoose.model('store', StoreSchema);