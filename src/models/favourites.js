const mongoose = require('mongoose');

const FavouriteSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    products:[{
        product: {type: mongoose.Schema.Types.ObjectId, ref: "products"},
        _id:false
       

    }]

    
},
{
    timestamps: true
}
)

exports.Favourites= mongoose.model('favourites', FavouriteSchema);