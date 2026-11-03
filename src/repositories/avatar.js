const { Avatar } = require('../models/avatar');
const { User } = require('../models/user');

exports.findUserAvatar = async (user) => {
  return Avatar.findOne({
    owner: user._id,
  });
};

exports.updateUserAvatar = async (user, data) => {
  const avatar = await Avatar.findOne({
    owner: user._id,
  });
  if (!avatar) {
    return await new Avatar({
      owner: user._id,
      avatar: data,
    }).save();
  }
  return Avatar.findOneAndUpdate(
    {
      owner: user._id,
    },
    {
      $set: {
        avatar: data,
      },
    },
    {
      new: true,
    }
  );
};

exports.saveAvatarSnapshot = async (user, data) => {
  await Avatar.findOneAndUpdate(
    {
      owner: user._id,
    },
    {
      $set: {
        snapshot: data,
      },
    },
    {
      new: true,
    }
  );
  return await User.findOneAndUpdate(
    {
      _id: user._id,
    },
    {
      $set: {
        spaceApe: data,
      },
    },
    {
      new: true,
    }
  );
};
