const bcrypt = require('bcrypt');
const referralCodeGenerator = require('referral-code-generator');
const userRepository = require('../repositories/user');
const { v4: uuid } = require('uuid');

exports.generateHashedPassword = (password) => {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
};

exports.compareHashedPassword = (password, hashedPassword) => {
  return bcrypt.compareSync(password, hashedPassword);
};

const generateRefToken = async (user) => {
  let code = referralCodeGenerator.custom('lowercase', 3, 4, user.username);
  let codeDuplicate = await userRepository.findUserByRefToken(code);
  if (codeDuplicate) {
    return generateRefToken(user);
  } else {
    return code;
  }
};

const generateRecoveryToken = async (user) => {
  let code = uuid().split('-').join('').slice(6, 11).toUpperCase();
  let codeDuplicate = await userRepository.findUserByRecoveryToken(code);
  if (codeDuplicate) {
    return generateRecoveryToken();
  } else {
    await userRepository.updateUser(user, { recoveryToken: code });
    return code;
  }
};

exports.generateRefToken = generateRefToken;
exports.generateRecoveryToken = generateRecoveryToken;
