const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {

    first_name: {
      type: String,
    },
    last_name: {
      type: String,
    },
    phone_number: {
      type: String,
    },
    avatae_name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    date_of_birth: {
      type: String,
    },
    city: {
      type: String,
    },
    country: {
      type: String,
    },
    category: {
      type: String,
    },
    gender: {
      type: String,
    },
    phone: {
      type: Number,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    refToken: {
      type: String,
    },
    user_type: {
      type: String,
      enum: ["dreamer", "artist"],
      default: "dreamer",
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },
    referrals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
      },
    ],
    spaceApe: {
      type: String,
    },
    mode: {
      type: String,
      enum: ['light', 'dark'],
    },
    metacharms: [
      {
        type: Object,
      },
    ],
    idiokToken: {
      type: Number,
      default: 0,
    },
    lucidGold: {
      type: Number,
      default: 0,
    },
    recoveryToken: {
      type: String,
    },
    profile_picture: {
      type: String,
    },
    following: {
      type: Array,
    },
    followers: {
      type: Array,
    },
    Friends: {
      type: Array,
    },
    number_of_followers: {
      type: Number,
      default: 0,
    },
    location: {
      type: String
    },
    loginStreak: {
      type: Number,
      default: 0,
    },
    lastVisitDate: {
      type: Date,
    },
    xp: {
      type: Number,
      default: 0,
    },
    level: {
      type: String,
      default: 'Novice',
    },
    collectedItems: [
      {
        itemName: {
          type: String,
          required: true,
        },
        itemCount: {
          type: Number,
          default: 0,
        },
        _id: false,
      },
    ],
    number_of_friends: {
      type: Number,
      default: 0,
    },
    age: {
      type: Number,
    },
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Posts',
      },
    ],
    Beats: {
      type: Number,
    },
    Orbs: {
      type: Number,
    },
    experiences: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "experiences",
      },
    ],
    artist_name: {
      type: String,
    },
    desktop_display_picture: [
      {
        url: String,
        key: String,
      },
    ],
    mobile_display_picture: [
      {
        url: String,
        key: String,
      },
    ],
    about: {
      type: String,
    },
    favourites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "experiences",
      },
    ],
    playlists: [
      {
        name: {
          type: String,
          ref: "playlist",
        },
      },
    ],
    links: [
      {
        title: String,
        link: String,
      },
    ],
    theme_color: {
      type: String,
    },
    photo_gallery: [
      {
        url: String,
        key: String,
      },
    ],
    cart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'cart',
    },

    favourites:{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'favourites',
    },
    
    purchases: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "products",
    },

    fanbase:[{
      type: mongoose.Schema.Types.ObjectId, ref: 'fanbase'
    }]
  


  },

  





  

  {
    timestamps: true,
  }
);

exports.User = mongoose.model('User', userSchema);
