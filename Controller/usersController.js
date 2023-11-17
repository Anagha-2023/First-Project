const express = require('express')
const user = require('../routes/users')
const UserModel = require('../models/User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');


const categoryModel = require("../models/category");
const {productModel} = require("../models/product");

const { sentOtp } = require("../nodeMailer");
const {error , log } = require("console");


const product= (req,res)=>{
  res.redirect('/product-details')
}
const homepage = (req, res) => {
  res.render('home', { user: userName })
}


const getSignup = (req, res) => {
  res.render('userSignup');
}


const signuppost = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if the user already exists in the database
    const foundUser = await UserModel.findOne({ email: email });

    if (foundUser) {
      return res.render('userSignup', { errorMessage: 'User already exists. Please log in.' });
    }

    // Generate and send OTP (assuming you have a function sentOtp)
    const otp = await sentOtp(email);
    req.session.user = {
      name: username,
      email: email,
      password: password,
      status: false,
    };
    req.session.otp = otp;

    // Redirect to the OTP verification page
    res.redirect('/otp');
  } catch (error) {
    console.error(error);
    res.send('<script>alert("Error occurred while processing the request."); window.location.href = "/signup";</script>');
  }
};


const loginpage = (req, res) => {
  if (req.session.user) {
    req.session.user = true
    res.redirect('/');
  } else {
    res.render('index', { title: 'Login Page' });
  }
};

const loginpost = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await UserModel.findOne({ email: email });

    if (user) {
      // Check if the user is blocked
      if (user.isBlocked) {
        return res.render('index', { errorMessage: 'Your account is blocked. Contact support for assistance.' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
        user.status = true;
        await user.save();

        userName = user.name;
        userEmail = user.email;
        
        req.session.user = true;
        req.session.userDelete = false;

        res.status(200);
        res.redirect('/');
      } else {
        res.render('index', { errorMessage: 'Enter Valid Username or Password' });
      }
    } else {
      res.render('index', { errorMessage: 'Enter Valid Username or Password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};


// const loginpost = async (req, res) => {
//   const { email, password } = req.body;
//   console.log(req.body);

//   try {
//     console.log(UserModel);

//     let user = await UserModel.findOne({ email: email });


//     console.log(user);
//     if (user) {
//       const passwordMatch = await bcrypt.compare(password, user.password)


//       if (user && passwordMatch) {
//         console.log(user.status + "   before");
//         user.status = true;
//         await user.save();
//         console.log(user.status + "    after");

//         userName = user.name;
//         userEmail = user.email;
//         console.log(userName);
//         req.session.user = true;
//         req.session.userDelete = false;

//         res.status(200);
//         res.redirect('/');
//       }if(user.isBlocked){
//         req.session.isBlocked = true;
//         res.redirect('/login')
//    }
//     } else {
//       res.render('index', { errorMessage: 'Enter Valid Username or Password' });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Internal Server Error');
//   }
// };


const forgotpassword = (req, res) => {
  req.session.user=true
  res.render('forgotpassword');
};





let resetTokens;
console.log(resetTokens);
const forgotpost = async (req, res) => {
  console.log(req.body.email,req.body);
  const {email} = req.body

  req.session.forgotEmail=email
  console.log(email);
  // Check if the provided email exists in your user database
  let user = await UserModel.findOne({ email: email });

  if (!user) {
    return res.status(404).send('User not found');
  }

  // Generate a unique reset token and save it for the user
  const token = crypto.randomBytes(20).toString('hex');
  resetTokens = token;

  // Send a password reset email with a link containing the reset token
  const transporter = nodemailer.createTransport({
    service: 'Gmail', // Use your email service here
    auth: {
      user: 'anaghakb55@gmail.com',
      pass: 'ckbx hztv jusc ujre',
    },
  });

  const resetLink = `http://localhost:${3000}/reset-password?token=${token}`;

  const mailOptions = {
    from: 'anaghakb55@gmail.com',
    to: email,
    subject: 'Password Reset',
    text: `You are receiving this because you (or someone else) requested a password reset for your account.\n\n`
      + `Please click on the following link, or paste this into your browser to complete the process:\n\n`
      + `${resetLink}\n\n`
      + `If you did not request this, please ignore this email and your password will remain unchanged.`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      res.status(500).send('Failed to send reset email');
    } else {
      console.log(`Email sent: ${info.response}`);


    }
  });
  console.log(resetTokens);
  res.redirect('/forgot-password')
};


const resetPassword = (req, res) => {
  const email=req.body
  
  if (!email){
    res.status(400).send('Invalid or expired token.')
  }else{
    res.render('resetpassword')
  }}

  const resetPasswordpost = async (req, res) => {
    const {  password, confirmPassword } = req.body;
    console.log(req.body.password)

    if (password !== confirmPassword) {
      return res.status(400).send('Passwords do not match');
    }
  
    try {
      // Find the user by email and update the password
      let user = await UserModel.findOne({ email: req.session.forgotEmail });
      
      
      if (!user) {
        return res.status(404).send('User not found');
      }
  
      // Update the user's password in your database or user storage
      user.password = password;
      await user.save(); // Save the changes
  
      res.render('index');
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  };




  const postVerifyOtp = async (req, res, next) => {
    const { otp } = req.body;
  
    try {
      if (req.session.otp !== null) {
        if (!isNaN(otp)) {
          if (otp === req.session.otp) {
            // Save the user to the database
            await UserModel.create(req.session.user);
            req.session.user = req.session.user.email;
            res.render('index');
          } else {
            req.session.otpFalse = true;
            res.render('otp');
          }
        }
      } else {
        req.session.otpExpired = true;
        res.redirect('/otp');
      }
    } catch (error) {
      console.error(error);
      res.redirect('/signup');
    }
  };
  
  // Function to render the OTP verification page
  const loadOTP = async (req, res) => {
    try {
      if (req.session.otpExpired) {
        req.session.otpExpired = false;
        res.render('otp', { err: 'Otp expired' });
      } else if (req.session.otpFalse) {
        req.session.otpFalse = false;
        res.render('otp', { err: 'Incorrect Otp' });
      } else {
        res.render('otp', { err: '' });
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  
  const resendOtp = async (req, res, next) => {
    try {
      if (req.session.user) {
        console.log("Resending OTP to:", req.session.user.email);
        req.session.otp = await sentOtp(req.session.user.email);
        console.log("New OTP:", req.session.otp);
        res.status(200).json({ status: true });
      } else {
        console.log("User session not found");
        res.status(201).json({ status: true });
      }
    } catch (e) {
      console.error("Error in resendOtp:", e);
      res.status(404).json({ status: true });
    }
  };

const logout = async (req, res) => {
  try {
    if (req.session.user) {
      req.session.user = false;
      // const user = await UserModel.findOne({ email: userEmail });
      // console.log(user + '    logout');
      // if (user) {
      //   user.status = false; // Set status to false on logout
      //   await user.save();
      // }
      // console.log(user + '    after logout');
    }
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  };
}

function otpNull(req,res,next){

  if(req.session.otp!=null) {
    setTimeout(()=>{
      log('null aakeee')
      req.session.otp = null;
  },1000 * 60 * 3);
  }
}


module.exports = { logout, getSignup, loginpost, loginpage, signuppost, forgotpassword, homepage, forgotpost, resetPassword, resetPasswordpost, loadOTP, postVerifyOtp, resendOtp, product};