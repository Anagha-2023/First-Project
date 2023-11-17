const express = require('express');
const router = express.Router();
const usersController = require('../Controller/usersController');


let userName, userEmail;


router.get('/', isAuthenticated,usersController.homepage)

router.get('/login',usersController.loginpage)

router.post('/login',usersController.loginpost)

router.get('/logout', usersController.logout)

router.get('/signup', usersController.getSignup)

router.post('/signup',usersController.signuppost)

router.get('/forgot-password',usersController.forgotpassword)

router.post('/forgot-password', usersController.forgotpost)

router.get('/reset-password', usersController.resetPassword)

router.post('/reset-password', usersController.resetPasswordpost)

router.get("/product-details",usersController.product)

router.get("/otp",usersController.loadOTP);
router.post('/postotp',usersController.postVerifyOtp);
router.post('/resend-otp',usersController.resendOtp)




function isAuthenticated(req, res, next) {
  if (req.session && req.session.user && req.session.userDelete === false) {
    next();
  } else {
    res.redirect('/login');
  }
}

module.exports = router



