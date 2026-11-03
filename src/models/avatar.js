const mongoose = require('mongoose');

const avatarSchema = new mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },
    background:{
      type: Map,
      of: String
    }
  ,
  hair:{
    type: Map,
    of: String
  },
  eye:{
    type: Map,
    of: String
  },
  jacket:{
    type: Map,
    of: String
  },
  shirt:{
    type: Map,
    of: String
  },
  mouth:{
    type: Map,
    of: String
  },
  skin:{
    type: Map,
    of: String
  },

  avatarurl:{
    type:String
  },
  
  lucidmoji:{
    type: String

  }
  
    

  }
);

exports.Avatar = mongoose.model('avatar', avatarSchema);
