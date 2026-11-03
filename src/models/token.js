const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "user",
        
    },

    token:{
        type: String,
        createdAt: Date.now(),
        expires: 3600

    },
    email:{
        type: String

    }
    
})

exports.Token = mongoose.model('token', tokenSchema);