const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({

    name:{
        type: String,
        required: true
    },

    weight:{
        type : String
    },
    length:{
        type: String
    }    ,
    height: {
        type: String 
    },
    price:{
        type: Number,
        required : true
    },
    currency:{
            type: String,
            required: true,
            default: "USD"
    },
    item_type: {
        type: String,
        enum:["physical", "virtual", "hybrid"]

    },
    size:{
        type: String
    },


    description: {
        type: String
    },
    instock: {type: Boolean, default: true},
    quantity: {type :Number, required: true, default: true},
    store : {type: mongoose.Schema.Types.ObjectId,ref: 'Store', required: true},
    images: []



    },
    {
        timestamps: true,
      }
    )

exports.Product = mongoose.model('products', ProductSchema);