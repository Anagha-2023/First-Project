const express = require('express')
const user = require('../routes/users')
const UserModel = require('../models/User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const Referral = require('../models/referralSchema');
const uuidv4 = require('uuid').v4;
require("dotenv").config();

const CategoryModel = require("../models/category");
const { productModel } = require("../models/product");
const addressModel = require('../models/addressSchema')
const orderModel = require('../models/orderSchema')
const cartModel = require('../models/cartSchema')
const Wallet = require('../models/walletSchema')
const { sentOtp } = require("../nodeMailer");
const { error, log } = require("console");


const product = async (req, res) => {
  try {
    const id = req.params.productId;
    const product = await productModel.findById(id);
    const category = await CategoryModel.find({});
    if (!product) {
      // Handle the case where the product with the specified id is not found
      return res.status(404).json({
        message: "No such product found",
      });
    }
    // Render a template to display the product details
    res.render("product-details", {
      product,
      category,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error",
      errorMessage: error.message,
    });
  }
};

let home = async (req, res) => {
  try {
    let products = await productModel.find({}).limit(4);
    let latestProducts = await productModel.find({}).sort({ createdAt: -1 }).limit(10);
    let item = await productModel.find();
    const category = await CategoryModel.find({});
    // const cart = await cartModel.findOne();
    const searchQuery = req.query.search || '';
    let cartItemCount = 0;

    if (req.session.user) {
      let user = await UserModel.findOne({ email: req.session.user.email });

      console.log(req.session.user.email, "......................................................");

      let cart = await cartModel.findOne({
        owner: user._id
      });
      console.log(cart, "///////////////////////////////")
      if (user && !user.isBlocked) {

        if (cart) {
          cartItemCount = cart.items.length;
        }

        res.render("home", {
          item,
          cart,
          products,
          latestProducts,
          category,
          userEmail: user.email,
          cartItemCount: cartItemCount,
          searchQuery: searchQuery,
        });
      } else {
        req.session.isBlocked = true;
        return res.redirect('/login');
      }
    } else {
      // Handle the case where req.session.email doesn't exist
      res.render("home", {
        item,
        cart,
        products,
        latestProducts,
        category,
        userEmail: null, // or set a default value
        cartItemCount: cartItemCount,
        searchQuery: searchQuery,
      });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};





const getSignup = (req, res) => {
  res.render('userSignup');
}


const signuppost = async (req, res) => {
  try {
    const { username, email, password, phone, confirmpassword } = req.body;

    // Validate user input (You can use a validation library or implement your own validation logic)

    // Check if the user already exists in the database
    const foundUser = await UserModel.findOne({ email: email });

    if (foundUser) {
      return res.render('userSignup', { errorMessage: 'User already exists. Please log in.' });
    }

    if (password.length < 8) {
      return res.render('userSignup', { errorMessage: 'Password must be at least 8 characters long' });
    } else {
      // Check for uppercase letters, lowercase letters, numbers, and special characters
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return res.render('userSignup', { errorMessage: 'Password must meet the specified criteria' });
      }
    }

    // Compare Password and Confirm Password
    if (password !== confirmpassword) {
      return res.render('userSignup', { errorMessage: 'Passwords do not match.' });
    }

    // Generate and send OTP
    const otp = await sentOtp(email);

    // Hash the password before saving it to the database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user information to the session
    req.session.user = {
      name: username,
      email: email,
      password: hashedPassword,
      confirmPassword: confirmpassword,
      phone: phone,
      status: false,
    };

    req.session.otp = otp;
    req.session.expirationtime = new Date();

    // Redirect to the OTP verification page
    res.redirect('/otp');
  } catch (error) {
    console.error(error);
    res.status(500).send('<script>alert("Error occurred while processing the request."); window.location.href = "/signup";</script>');
  }
};





const loginpage = (req, res) => {
  console.log(req.session.user, ";;;;;;;;;;;;;;;;;;;;;;;;;;;;;");
  if (req.session.user) {
    // The user is already logged in, redirect to the home page
    res.redirect('/');
  } else {
    // The user is not logged in, render the login page
    res.render('index', { title: 'Login Page' });
  }
};



const loginpost = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(password);
    // Check if the user exists in the database
    const user = await UserModel.findOne({ email: email });

    console.log(user);

    if (!user) {
      return res.render('index', { errorMessage: 'User not found' });
    }

    // Check if the user is blocked
    if (user.isBlocked) {
      return res.render('index', { errorMessage: 'Your account is blocked. Contact support for assistance.' });
    }

    // Trim the entered password during login
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      user.status = true;
      await user.save();

      // Save only necessary user information in the session
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
      };

      req.session.userDelete = false;

      res.redirect('/');
    } else {
      // Incorrect password
      res.render('index', { errorMessage: 'Incorrect password' });
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



const userShop = async (req, res) => {
  try {
    const cart = await cartModel.findOne();
    const perPage = 6; // Define how many products you want per page
    const page = parseInt(req.query.page) || 1; // Get the page number from the request query parameters
    const sortOption = req.query.sort || 'featured'; // Get the sort option from the request query parameters or default to 'featured
    const selectedCategory = req.query.category || null;
    const searchQuery = req.query.search || '';

    const cartItemCount = cart ? cart.items.length : 0;
    let query = {
      isFeatured: true,
      $or: [{
        productName: {
          $regex: searchQuery,
          $options: 'i'
        }
      },
      {
        brand: {
          $regex: searchQuery,
          $options: 'i'
        }
      },
      ],
    };


    let sortCriteria = {};
    if (sortOption === 'lowToHigh') {
      sortCriteria = {
        afterDiscount: 1
      };
    } else if (sortOption === 'highToLow') {
      sortCriteria = {
        afterDiscount: -1
      };
    } else if (sortOption === 'releaseDate') {
      sortCriteria = {
        createdAt: -1
      }; // or any other field for release date
    } else if (sortOption === 'avgRating') {
      sortCriteria = {
        rating: -1
      }; // or any other field for average rating
    } else {
      // Default to 'featured' or any other default sorting option
      sortCriteria = {
        createdAt: -1
      }; // Default sorting
    }


    if (selectedCategory && mongoose.Types.ObjectId.isValid(selectedCategory)) {
      query.category = new mongoose.Types.ObjectId(selectedCategory);
    }
    let products = await productModel.find(query)
      // .populate("category", "name")
      .populate({
        path: "category",
        select: "name",
        match: { _id: new mongoose.Types.ObjectId(selectedCategory) }, // Add this match condition
      })
      .sort(sortCriteria)
      .skip(perPage * (page - 1)) // Skip products based on pagination
      .limit(perPage); // Limit the number of products per page

    // Reset filterProduct when the page changes
    if (!req.query.category && page > 1) {
      req.session.filterProduct = null;
    }


    // const totalProducts = await productModel.countDocuments({isFeatured: true});
    const totalProducts = await productModel.countDocuments();


    // Retrieve products based on the latest update timestamp
    // const latestProducts = await productModel.find({
    //     isFeatured: true
    //   })
    const latestProducts = await productModel.find({
      isFeatured: true
    })
      .populate("category", "name")
      .sort({
        createdAt: -1
      }) // Sort by the most recent updates
      .limit(4); // Retrieve the latest 3 products

    const category = await CategoryModel.find();


    // Calculate the total number of pages
    const totalPages = Math.ceil(totalProducts / perPage);

    // if (req.session.filterProduct) {
    //   products = req.session.filterProduct
    // }

    res.render("user-shop", {
      products,
      newProducts: latestProducts,
      category,
      currentPage: page,
      totalPages,
      sortOption,
      selectedCategory: selectedCategory,
      cart: cart,
      cartItemCount: cartItemCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Some error caused while rendering shop page",
    });
  }
};




const forgotpassword = (req, res) => {
  req.session.user = true
  res.render('forgotpassword');
};




let resetTokens;
console.log(resetTokens);
const forgotpost = async (req, res) => {
  console.log(req.body.email, req.body);
  const { email } = req.body

  req.session.forgotEmail = email
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
  const resetText = 'Click here to reset your password';
  console.log(resetLink);
  const mailOptions = {
    from: 'anaghakb55@gmail.com',
    to: email,
    subject: 'Password Reset',
    text: `You are receiving this because you (or someone else) requested a password reset for your account.\n\n`
      + `Please ${resetText} to complete the process.\n\n`
      + `If you did not request this, please ignore this email and your password will remain unchanged.`,
    html: `You are receiving this because you (or someone else) requested a password reset for your account.<br><br>`
      + `Please <a href="${resetLink}">${resetText}</a> to complete the process.<br><br>`
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
  const email = req.body

  if (!email) {
    res.status(400).send('Invalid or expired token.')
  } else {
    res.render('resetpassword')
  }
}

const resetPasswordpost = async (req, res) => {
  const { password, confirmPassword } = req.body;

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
    user.password = await bcrypt.hash(password, 10);
    await user.save(); // Save the changes

    // Clear the session variable storing the forgot email after password reset
    req.session.forgotEmail = null;

    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};


// change password 


const resetPasswordGet = async (req, res) => {
  try {
    const Token = req.params.tokenId;
    console.log(Token, req.session, req.session ? req.session.token : null, "0000000000000000000000000000000000000000000");

    if (req.session && req.session.token !== null) {
      return res.render('user-change-new-password', {
        Token
      });
    } else {
      console.log("null aanu tot.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Error Occured' + error
    });
  }
};



const postVerifyOtp = async (req, res, next) => {
  try {
    console.log("/////////////////////////////////////");
    const { otp } = req.body;
    const expirationtime = req.session.expirationtime;

    if (req.session.otp !== undefined) {
      const newtime = new Date();
      const expirationtime = req.session.expirationtime;
      let otpTime;

      try {
        otpTime = expirationtime ? new Date(expirationtime) : 0;
        if (isNaN(otpTime)) {
          throw new Error("Invalid date");
        }
      } catch (error) {
        console.error("Error parsing expirationtime:", expirationtime);
        otpTime = 0;
      }

      const timeDifference = newtime - otpTime;

      console.log(newtime, "]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]");
      console.log(otpTime, "[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[");
      console.log(timeDifference, "time");

      if (timeDifference <= 60 * 1000) {
        if (!isNaN(otp)) {
          if (otp === req.session.otp) {
            const newUser = new UserModel({
              name: req.session.user.name,
              email: req.session.user.email,
              password: req.session.user.password,
              confirmPassword: req.session.user.confirmPassword,
              phone: req.session.user.phone,
              status: false,
            });

            const newReferrer = new Referral({
              referralId: uuidv4(),
              referralLink: uuidv4(),
              userId: newUser.id,
            });

            newReferrer.save();

            newUser.refId = newReferrer._id;

            const newWallet = new Wallet({
              user: newUser.id,
            });

            // Save the new wallet
            await newWallet.save();

            // Update the user's wallet ID in the user document
            newUser.wallet = newWallet._id;

            // Save the updated user
            await newUser.save();

            if (req.session.reflink) {
              try {
                const referrer = await Referral.aggregate([
                  {
                    $match: {
                      referralLink: req.session.reflink,
                    },
                  },
                  {
                    $lookup: {
                      from: 'users',
                      localField: 'userId',
                      foreignField: '_id',
                      as: 'user',
                    },
                  },
                  {
                    $unwind: '$user',
                  },
                  {
                    $lookup: {
                      from: 'wallets',
                      localField: 'user.wallet',
                      foreignField: '_id',
                      as: 'wallet',
                    },
                  },
                  {
                    $unwind: '$wallet',
                  },
                  {
                    $project: {
                      userId: '$user.id',
                      wallet: '$wallet',
                    },
                  },

                ]);

                console.log(referrer);

                if (referrer.length > 0) {
                  const referralAmount = 500;
                  const referralBonus = referralAmount * 0.5;

                  // Updating the referrer's wallet with the referral bonus
                  referrer[0].wallet.balance += referralBonus;
                  referrer[0].wallet.transactions.push({
                    amount: referralAmount,
                    type: 'credit',
                    description: 'Referral Bonus',
                  });

                  // Save the changes to the referrer's wallet
                  await Wallet.findByIdAndUpdate(referrer[0].wallet._id, referrer[0].wallet);

                  // Updating the new user's wallet with the referral bonus
                  newWallet.balance += referralBonus;
                  newWallet.transactions.push({
                    amount: referralBonus,
                    type: 'credit',
                    description: 'Referral Bonus',
                  });

                  // Save the changes to the new user's wallet
                  await newWallet.save();

                  // Update the user's wallet ID in the user document
                  newUser.wallet = newWallet._id;

                  // Save the changes to the user document
                  await newUser.save();
                }
              } catch (err) {
                console.error('Error finding referral:', err);
                res.status(500).json({
                  success: false,
                  message: err,
                });
              }
            }

            req.session.user = req.session.user.email;
            req.session.otpExpired = false;
            req.session.otpFalse = false;
            res.render('index');
            return;
          } else {
            req.session.otpFalse = true;
          }
        }
      } else {
        req.session.otpExpired = true;
        req.session.otpFalse = false;
      }
    }

    res.render('otp', {
      errorMessage: req.session.otpFalse ? 'Incorrect OTP' : 'OTP expired',
    });
  } catch (error) {
    console.error(error);
    res.render('otp', { errorMessage: 'An error occurred' });
  }
};












// Function to render the OTP verification page
const loadOTP = async (req, res) => {
  try {
    if (req.session.otpExpired) {
      req.session.otpExpired = false;
      res.render("otp", {
        errorMessage: 'OTP expired!',
      });
    } else if (req.session.otpFalse) {
      req.session.otpFalse = false;
      res.render("otp", {
        errorMessage: 'Incorrect OTP',
      });
    } else {
      res.render("otp", {
        errorMessage: "",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

const resendOtp = async (req, res, next) => {
  try {
    if (req.session.user) {
      console.log("Resending OTP to:", req.session.user.email);
      req.session.otp = await sentOtp(req.session.user.email);

      // Update expiration time for the new OTP (e.g., set it to 60 seconds from now)
      const newExpirationTime = new Date(Date.now() + 60 * 1000);
      req.session.expirationtime = newExpirationTime;

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

function otpNull(req, res, next) {

  if (req.session.otp != null) {
    setTimeout(() => {
      log('null aakeee')
      req.session.otp = null;
    }, 1000 * 60 * 3);
  }
}


const userProfile = async (req, res) => {
  const ITEMS_PER_PAGE = 5;

  try {
    // Check if user details are in the session
    if (!req.session.user || !req.session.user.id) {
      return res.status(200).redirect('/login');
    }

    const userId = req.session.user.id;
    console.log(userId, ".......................................................");
    const category = await CategoryModel.find({ status: 'active' });
    const addresses = await addressModel.findOne({ user: userId });
    console.log(addresses, ";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;");

    let [user] = await UserModel.aggregate([{
      $match: {
        _id: new mongoose.Types.ObjectId(userId), // Assuming userId is accessible
      },
    }, {
      $lookup: {
        from: "wallets",
        localField: "wallet",
        foreignField: "_id",
        as: 'walletDetails'
      }
    },
    {
      $limit: 1
    }
    ])

    console.log(user);

    const loggedUser = await Referral.findOne({
      userId: req.session.user.id
    })

    console.log(loggedUser)
    const generatedRefLink = `${req.protocol}://${req.headers.host}/signup?reflink=${loggedUser.referralLink}`

    console.log(generatedRefLink, "////////////////////////////////////////////")

    const wallet = await Wallet.findOne({ user: userId });
    console.log(wallet.balance, ";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;");
    // Pagination logic
    const page = parseInt(req.query.page) || 1;
    const totalOrders = await orderModel.countDocuments({ user: userId });
    const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const orderDetails = await orderModel
      .find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(ITEMS_PER_PAGE);

    // Fetch the user's cart and get the item count
    let cartItemCount = 0;
    const cart = await cartModel.findOne({ owner: userId });
    if (cart) {
      cartItemCount = cart.items.length;
    }

    res.status(200).render('user-profile', {
      category,
      user: true,
      addresses,
      user,
      orderDetails,
      currentPage: page,
      totalPages: totalPages,
      cartItemCount,
      wallet,
      generatedRefLink,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      message: error.message || 'Internal Server Error',
    });
  }
};



const changePassword = async (req, res) => {
  try {

    let user = (req.session.userId) ? true : false


    const transporter = nodemailer.createTransport({
      service: 'Gmail', // Use your email service here
      auth: {
        user: 'anaghakb55@gmail.com',
        pass: 'ckbx hztv jusc ujre',
      },
    });

    const userId = req.session.user.id
    console.log(userId, "ind+++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
    const userDetails = await UserModel.findOne({
      _id: userId
    });
    if (!userDetails) {
      return res.status(404).json({
        message: 'User is not found'
      });
    }
    const email = userDetails.email;
    console.log(email, "``````````````````````````````````````````````````````````````````````")
    const token = crypto.randomBytes(32).toString('hex');
    req.session.token = token
    setTimeout(() => {
      console.log("expire =+ = +  iiii");
      req.session.token = null
    }, 1000 * 60 * 15)
    console.log(token, "toooooooooooooooooooooooooooooooooooooooookkkkkkkkkkkkkkkkkkkkkeeeeeeeeeeeeeeennnnn")
    // const updatedUser = await UserModel.findByIdAndUpdate(
    //   userId,
    //   {
    //     $set: {
    //       resetToken: token,
    //       resetTokenExpiration: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes in milliseconds
    //     },
    //   },{
    //     upsert:true
    //   }
    // );

    // if (!updatedUser) {
    //   return res.status(500).json({ message: 'Failed to update user data' });
    // }

    const mailOptions = {
      to: email,
      subject: 'Password Reset Request',
      text: `Click the following link to reset your password: http://localhost:3000/resetpassword/${token}`,
      html: `<p>Click the following link to reset your password:</p><p><a href="http://localhost:3000/resetpassword/${token}">http://localhost:3000/resetpassword/${token}</a></p>`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(201).json({
      message: 'Reset password link is sent successfully'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: `INTERNAL SERVER ERROR ${err}`
    });
  }
}



const UpdateProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    // Retrieve user details from the form
    const { username, email, phone } = req.body;

    // Find the user by ID
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user details
    user.name = username;
    user.email = email;
    user.phone = phone;

    // Save changes to the database
    await user.save();

    // Redirect to a profile page or send a success response
    res.redirect('/profile');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};








const userOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    console.log(orderId)
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(404).json({
        success: false,
        message: 'It is not an Valid Id'
      });
    }
    // Implement logic to delete the order by its ID from the database
    // You should also add error handling as needed
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order Not found in Database'
      })
    }

    const orders = await orderModel.findOne({ _id: orderId })
      .sort({
        createdAt: -1
      }).populate('user', 'name').exec();

    const userId = orders.user;
    console.log(userId, "111111111111111111111111111111111111111111111111111");
    const user = await UserModel.findOne({ _id: userId });

    const category = await CategoryModel.find({})
    res.render('user-order-detailed-view', {
      pagetitle: '',
      order: orders,
      user,
      category
    });

  } catch (error) {
    console.log(error);
    res.status(500).send('Error retrieving order details: ' + error.message);
  }
}

// cancel order 

const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    // Check if the order exists
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    // Retrieve the products associated with the canceled order
    const canceledProducts = order.items;

    console.log(canceledProducts)
    // Increase stock counts for each canceled product
    for (const product of canceledProducts) {
      const productId = product.productId;
      const quantity = product.quantity;

      // Find the product in your database
      const productToUpdate = await productModel.findById(productId);

      if (!productToUpdate) {
        return res.status(404).json({
          success: false,
          error: "Product not found for restocking",
        });
      }

      // Increase the stock count
      productToUpdate.countInStock += quantity;

      // Save the updated product
      await productToUpdate.save();
    }

    // Mark the order as "Canceled" and save it
    order.status = "Canceled";
    await order.save();

    return res.json({
      success: true,
      message: "Order canceled successfully"
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};


const userAddAddress = async (req, res) => {
  try {
    // Get the address data from the request body
    // console.log("vannu in address")
    const {
      addressType,
      houseNo,
      street,
      landmark,
      pincode,
      city,
      district,
      state,
      country
    } = req.body;

    const userId = req.session.user.id; // You can get the user's ID from the cookie or authentication system

    // Check if the user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the user's address document
    let useraddresses = await addressModel.findOne({
      user: userId
    });

    if (!useraddresses) {
      // If the useraddresses document doesn't exist, create a new one
      useraddresses = new addressModel({
        user: userId,
        addresses: []
      });
    }

    // Check if the address already exists for the user
    const existingAddress = useraddresses.addresses.find((address) =>
      address.addressType === addressType &&
      address.HouseNo === houseNo &&
      address.Street === street &&
      address.pincode === pincode &&
      address.city === city &&
      address.State === state &&
      address.Country === country
    );

    if (existingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Address already exists for this user'
      });
    }

    if (useraddresses.addresses.length >= 3) {
      return res.status(400).json({
        success: false,
        message: 'User cannot have more than 3 addresses',
      });
    }

    // Create a new address object
    const newAddress = {
      addressType: addressType,
      HouseNo: houseNo,
      Street: street,
      Landmark: landmark,
      pincode: pincode,
      city: city,
      district: district,
      State: state,
      Country: country,
    };

    useraddresses.addresses.push(newAddress);

    // Save the updated address document
    await useraddresses.save();

    // Respond with a success message
    res.status(200).json({
      status: true
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      // Handle validation errors
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: err.errors
      });
    } else {
      console.log(err);
      res.status(500).render('500error', {
        success: false,
        message: 'Internal Server Error'
      });
    }
  }
};

const userEditAddress = async (req, res) => {
  try {
    const {
      addressType,
      HouseNo,
      Street,
      Landmark,
      pincode,
      city,
      district,
      state,
      Country
    } = req.body;

    const userId = req.session.user.id;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const addresses = await addressModel.findOne({
      user: userId
    })

    if (!addresses) {
      return res.status(404).json({
        success: false,
        message: 'Addresses not found'
      });
    }

    // Find the address you want to edit based on the provided address type
    const addressToEdit = addresses.addresses.find(addr => addr.addressType === addressType);

    if (!addressToEdit) {
      return res.status(404).json({
        success: false,
        message: `Address with type '${addressType}' not found`
      });
    }

    // Update the address details
    addressToEdit.HouseNo = HouseNo;
    addressToEdit.Street = Street;
    addressToEdit.Landmark = Landmark;
    addressToEdit.pincode = pincode;
    addressToEdit.city = city;
    addressToEdit.district = district;
    addressToEdit.State = state;
    addressToEdit.Country = Country;

    // Save the updated address
    await addresses.save();

    res.status(200).redirect('/profile');

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

const userdeleteAddress = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const addresses = await addressModel.findOne({
      user: userId
    })

    if (!addresses) {
      return res.status(404).json({
        success: false,
        message: 'Addresses not found'
      });
    }

    const addressTypeToDelete = req.query.addressType; // Get the addressType to delete from the query parameter
    // Find the index of the address with the provided addressType
    const addressIndexToDelete = addresses.addresses.findIndex((address) => address.addressType === addressTypeToDelete);

    if (addressIndexToDelete === -1) {
      return res.status(404).json({
        success: false,
        message: `Address with type '${addressTypeToDelete}' not found`
      });
    }
    // Remove the address with the specified addressType
    addresses.addresses.splice(addressIndexToDelete, 1);

    await addresses.save();

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (err) {
    next(err);
  }
}

const resetPasswordPost = async (req, res) => {
  try {
    console.log(req.body);
    const token = req.body.token;
    const password = req.body.newPassword;
    const confirm_password = req.body.confirmnewPassword;

    // Strong password validations
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters, including at least one lowercase letter, one uppercase letter, one number, and one special character.'
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        message: 'The confirm password and password must be the same.'
      });
    }

    const user = await UserModel.findOne({
      email: req.body.Email
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found.'
      });
    }

    console.log(user);
    user.password = password;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Successfully Password Changed'
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Error saving the new password.'
    });
  }
}




const returnOrder = async (req, res) => {
  try {
    const { oId, returnReason } = req.body;
    console.log(req.body.oId, "order id in the session ")
    const userId = req.session.user.id;
    const order = await orderModel.findOne({ oId: oId });

    console.log(userId, order, returnReason)

    if (!order) {
      return res.status(404).json({ success: false, message: 'order Not found in Database' })
    }
    // Check if the user making the request is the owner of the order
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to return this order' });
    }
    // Check if the order status allows a return
    if (order.status !== 'Delivered') {
      return res.status(400).json({ success: false, message: 'Order must be Delivered to initiate a return' });
    }

    // Update the order status to 'Returned'
    order.status = 'Returned';

    // Update the return request in the order
    order.requests.push({
      type: 'Return',
      status: 'Pending', // You can set it to 'Pending' initially
      reason: returnReason,
    });

    // Save the updated order
    await order.save();
    res.status(200).json({ success: true, message: 'Return request submitted successfully' });
  } catch (err) {
    console.log(err)
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}

// const downloadInvoice = async (req, res) => {
//   try {
//     // if (req.query.from === '$2b$10$gviVtGpDfqpsAsCkbx8xaukeIQDirbAk2vIJ0IhJROGzYHeHUERp2') {

//     let order = await orderModel.findById(req.params.orderId)
//     let user = await UserModel.findById(order.user)

//     console.log("innn")
//     console.log(order, order ?.items);
//     let products = order.items.map((item, index) => {
//       return {
//         "quantity": item.quantity,
//         "price": item.productPrice,
//         "tax-rate": 0.0,
//         "description": item.name,
//       }
//     });


//     var data = {
//       "customize": {},
//       "images": {
//         "logo": "https://public.easyinvoice.cloud/img/logo_en_original.png",
//         // "background": "https://public.easyinvoice.cloud/img/watermark-draft.jpg"
//       },
//       "sender": {
//         "company": "Homeworld",
//         "address": "Home world Decors",
//         "zip": "680502",
//         "city": "Thrissur",
//         "country": "INDIA"
//       },
//       "client": {
//         "company": user ?.name || "N/A",
//         "address": user.email,
//         "city": order.deliveryAddress.city,
//         "zip": "PIN :" + order.deliveryAddress.pincode,
//         "phone": user.phone,
//         "country": order.deliveryAddress.Country,
//       },
//       "information": {
//         "number": user.phone,
//         "date": order.orderDate,
//         "due-date": "PAID"
//       },
//       "products": products,
//       "bottom-notice": "Thank you for supporting us, Inloop Watches",
//       "settings": {
//         "currency": "INR",
//       },
//       "translate": {},
//     };
//     easyinvoice.createInvoice(data, function (result) {
//       const base64Data = result.pdf;
//       res.setHeader('Content-Type', 'application/pdf');
//       res.setHeader('Content-Disposition', 'attachment; filename="INVOICE_' + Date.now() + '_.pdf"');
//       const binaryData = Buffer.from(base64Data, 'base64');
//       res.send(binaryData);
//     });
//     // } 
//     // else {
//     //     res.redirect('/profile')
//     // }

//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Error generating the PDF');
//   }

// }
const createuserReferral = async (req, res) => {
  try {
    const user = await UserModel.findById(req.session.user.id);

    // Create a new referral
    const newReferrer = new Referral({
      referralId: uuidv4(),
      referralLink: uuidv4(),
      userId: user.id,
    });

    // Save the new referral to the database
    await newReferrer.save();

    // Update the user's refId with the new referral's _id
    user.refId = newReferrer._id;

    // Save the user with the updated refId
    await user.save();

    console.log(newReferrer);
    // Assuming generatedRefLink should be the referral link
    const generatedRefLink = `${req.protocol}://${req.headers.host}/register?reflink=${newReferrer.referralLink}`
    res.status(200).json({
      success: true,
      referralLink: generatedRefLink
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err
    });
  }
};



module.exports = {
  logout,
  getSignup,
  loginpost,
  loginpage,
  signuppost,
  forgotpassword,
  home,
  forgotpost,
  resetPassword,
  resetPasswordpost,
  loadOTP,
  postVerifyOtp,
  resendOtp,
  product,
  userShop,
  userProfile,
  userAddAddress,
  userEditAddress,
  UpdateProfile,
  userdeleteAddress,
  userOrderDetails,
  cancelOrder,
  changePassword,
  resetPasswordGet,
  resetPasswordPost,
  returnOrder,
  createuserReferral,
  // downloadInvoice,  

};