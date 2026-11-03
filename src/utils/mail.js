const nodemailer = require('nodemailer');
const { userRouter } = require('../routes/user');
const fs = require('fs');
const path = require('path');
let username = process.env.EMAIL_USERNAME;
let password = process.env.EMAIL_PASSWORD;


const transporter = nodemailer.createTransport({
  //host:'smtp.porkbun.com',
  //port: 465,
  //secure: true, // true for 465, false for other ports
  service: 'gmail',
  auth: {
    user: username,
    pass: password,
  },
});

exports.sendPasswordResetEmail = async (user, otp) => {
  const msg = {
    to: user.email,
    from: {
      name: 'Lucid Jungles',
      address: username,
    },
    subject: `Password Recovery Request`,
    html: `<p>Hello ${titleCase(user.username)},</p><p>As requested, find below your one-time-token to complete your password recovery on Lucid Jungles.</p><p>${otp}</p> <br /> <p>Do ensure not to share this token with anyone.</p>`,
  };

  // sending the mail
  return new Promise((resolve, reject) => {
    transporter
      .sendMail(msg)
      .then((status) => {
        resolve(status);
      })
      .catch((error) => {
        reject(error);
        return;
      });
  });
};

exports.sendverificationMail = async (user, url) => {
  
  const templatePath = path.join(__dirname, '../controllers/verification_email.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  
  html = html.replace(/{{USER_NAME}}/g, user.username ? user.username : 'User');
  html = html.replace(/{{VERIFICATION_LINK}}/g, url);

  const msg = {
    to: user.email,
    from: {
      name: 'Lucid Jungles',
      address: username,
    },
    subject: 'Email Verification',
    html: html,
  };

  // sending the mail
  return new Promise((resolve, reject) => {
    transporter
      .sendMail(msg)
      .then((status) => {
        resolve(status);
      })
      .catch((error) => {
        reject(error);
        return;
      });
  });
};


function titleCase(str) {
  return str.toLowerCase().split(' ').map(function(word) {
    return (word.charAt(0).toUpperCase() + word.slice(1));
  }).join(' ');
}