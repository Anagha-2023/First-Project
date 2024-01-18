const express = require('express');
const router = express.Router();
const usersController = require('../Controller/usersController');
const cartcontroller = require('../Controller/cartcontroller');
const checkoutController = require('../Controller/checkoutController')
const wallet = require('../Controller/walletController')


let userName, userEmail;


router.get('/', isAuthenticated, usersController.home)

router.get('/login', usersController.loginpage)

router.post('/login', usersController.loginpost)

router.get('/logout', noCache, usersController.logout)

router.get('/signup', usersController.getSignup)

router.post('/signup', usersController.signuppost)

router.get('/forgot-password', usersController.forgotpassword)

router.post('/forgot-password', usersController.forgotpost)

router.get('/reset-password',  usersController.resetPassword)

router.post('/reset-password', usersController.resetPasswordpost)

router.get('/product-details/:productId', isAuthenticated, usersController.product)
router.get('/shop', isAuthenticated, usersController.userShop)

router.get("/otp", usersController.loadOTP);
router.post('/postOtp', usersController.postVerifyOtp);
router.post('/resend-otp', usersController.resendOtp)

//profile
router.get('/profile', isAuthenticated, usersController.userProfile)
router.get('/profile/change-password',usersController.changePassword)
router.post('/update-profile',isAuthenticated,usersController.UpdateProfile)
router.post('/profile/addAddress', isAuthenticated, usersController.userAddAddress)
router.post('/profile/editAddress', isAuthenticated, usersController.userEditAddress)
router.delete('/profile/deleteAddress', isAuthenticated, usersController.userdeleteAddress)

// change password 

router.get('/resetpassword/:tokenId',usersController.resetPasswordGet)
router.post('/resetpassword',usersController.resetPasswordPost);


//cart 
router.get('/getCart', isAuthenticated, cartcontroller.userCart)
router.post('/addtocart', isAuthenticated, cartcontroller.addToCart)
router.post('/update-cart-quantity', isAuthenticated, cartcontroller.cartPut)
router.post('/remove-product', isAuthenticated, cartcontroller.cartRemove)

//checkout
router.get('/checkout', isAuthenticated, checkoutController.orderCheckout)
router.post('/checkout', isAuthenticated, checkoutController.orderCheckoutPost)
router.get('/order-confirmation/:orderId', isAuthenticated, checkoutController.orderConfirmation)
router.post('/order-payment-online', isAuthenticated,checkoutController.razorpayVerify)
router.get('/payment-failed', isAuthenticated,checkoutController.razorpayFailed)
router.post('/return-order', isAuthenticated,checkoutController.returnOrder)


router.get('/order-details/:orderId', isAuthenticated, usersController.userOrderDetails)
router.post('/cancel-order/:orderId', isAuthenticated, usersController.cancelOrder)

//COUPON MANAGEMENT

router.get('/getCoupons',checkoutController.getCoupons);
router.get('/applyCoupon',checkoutController.applyCoupon)

//Wallet Route
router.post('/create-razorpay-order', isAuthenticated,wallet.WalletRazorpayCreation)
router.post('/confirm-payment', isAuthenticated,wallet.WalletConfirmPayment)
router.post('/withdraw', isAuthenticated,wallet.withdrawMoney)

router.get('/order-details/downloadInvoice/:orderId',isAuthenticated,usersController.downloadInvoice)

router.get('/refer',isAuthenticated,usersController.createuserReferral)

function isAuthenticated(req, res, next) {
  // Check if the user is authenticated, not marked for deletion, and not blocked
  if (req.session && req.session.user && req.session.userDelete === false && !req.session.user.isBlocked) {
    next();
  } else {
    // Send a response indicating blocked status
    res.redirect('/login')
  }
}


function noCache(req, res, next) {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
}

module.exports = router



