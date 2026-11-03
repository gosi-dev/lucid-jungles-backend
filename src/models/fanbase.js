const mongoose = require('mongoose');

const FanbaseSchema = new mongoose.Schema({
    creator:{type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    name: {type: String, required: true},
    description: {type: String},
    cover_image: {type: String},
    members: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    total_members: {type: Number, default: 0},
    followers: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],

    // Monetisation
    isPaid: {type: Boolean, default: false},
    membershipFee: {type: Number, default: 0},
    currency: {type: String, default: 'USD'},

    // Type controls which custom onboarding flow runs at join
    fanbaseType: {
        type: String,
        enum: ['fitness', 'agency', 'venue', 'music', 'general'],
        default: 'general'
    },

    community_goals:[{
        goal_name:{type: String},
        goal_description:{type: String},
        cover_photo:{type: String},
        progress:{ current:{type: String}, goal:{type: String, }},
        _id:false




        
    }],
    fanbase_map:[{
        custom_name: {type: String},
        category:{type: String},

    }]
    

    
},
{
    timestamps: true
}
)

exports.Fanbase = mongoose.model('fanbase', FanbaseSchema);