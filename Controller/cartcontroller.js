const mongoose = require('mongoose');
const UserModel = require('../models/User');
const { productModel } = require("../models/product");
const CategoryModel = require("../models/category");
const cartModel = require('../models/cartSchema')
const { log } = require("console");
const { ObjectId } = require('mongodb');





const userCart = async (req, res) => {
  console.log("yaa");
  try {
    // console.log(req.session);
    console.log("hey")
    const userId = req.session.user.id;
    // console.log(userId,".................................");
    const category = await CategoryModel.find();
    console.log(userId);
    const cart = await cartModel.findOne({ owner: new ObjectId(userId) });
    console.log(cart);
    if (cart) {
      for (const item of cart.items) {
        let data = await productModel.findById(item.productId);
        item.data = data;
      }

      const user = await UserModel.findOne({
        _id: new mongoose.Types.ObjectId(userId),
      });

      let price = 0;
      if (cart) {
        price = cart.items.reduce((total, item) => total + item.quantity * item.price, 0);
      }

      const cartItemCount = cart ? cart.items.length : 0;
      console.log(cart.items);
      // Check if billTotal is zero, and if so, set cart.items to an empty array
      if (price === 0) {
        cart.items = [];
      }

      return res.render("user-cart", {
        category,
        cart: cart,
        user,
        cartItemCount: cartItemCount,
        totalPrice: price,
      });
    } else {
      return res.render("user-cart", {
        category,
        cart: [],
        user: "",
        cartItemCount: "",
        totalPrice: "",
      })
    }


  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err });
  }
};





const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;

    let product = await productModel.findOne({ _id: productId });

    // Check if the product is available
    if (!product || product.countInStock === 0) {
      return res.status(400).json({ success: false, message: "Product is out of stock" });
    }

    console.log(req.session);
    const userId = req.session.user.id;
    console.log('userId:', userId);

    const user = await UserModel.findById({ _id: userId });
    // Check if the user exists
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let cart = await cartModel.findOne({ owner: userId });
    console.log(cart);

    // Create a new cart if it doesn't exist
    if (!cart) {
      cart = new cartModel({
        owner: userId,
        items: [
          {
            productId,
            quantity: 1,
            name: product.productName,
            image: product.image,
            productPrice: product.afterDiscount,
            price: product.afterDiscount,
          },
        ],
        billTotal: product.afterDiscount,
      });
    } else {
      // Find the cart item by productId
      const cartItem = cart.items.find((item) => item.productId.toString() === productId);

      if (cartItem) {
        // Update existing cart item quantity
        if (cartItem.quantity < product.countInStock) {
          cartItem.quantity += 1;
          cartItem.price = cartItem.quantity * product.afterDiscount;
        } else {
          return res.status(205).json({ status: false, message: "Product is out of stock in the cart" });
        }
      } else {
        // Add new cart item
        cart.items.push({
          productId: productId,
          name: product.productName,
          image: product.image,
          productPrice: product.afterDiscount,
          quantity: 1,
          price: product.afterDiscount,
        });
      }

      // Calculate the bill total
      cart.billTotal = cart.items.reduce((total, item) => {
        // Check if the price is a valid number
        const itemPrice = Number(item.price);
        if (!isNaN(itemPrice)) {
          return total + itemPrice;
        } else {
          return total;
        }
      }, 0);
    }

    // Save the updated cart
    await cart.save();

    res.status(200).json({ status: true, message: "Product added to cart successfully" });
  } catch (err) {
    console.error("Error in addToCart:", err);

    // Respond with a more specific error message based on the type of error
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: "Validation error", errors: err.errors });
    }

    res.status(500).json({ success: false, message: "Internal server error" });
  }
};




const cartPut = async (req, res) => {
  try {
    console.log(req.body);
    const productId = req.body.productId;
    const userId = req.body.userId;
    console.log(userId);
    const cart = await cartModel.findOne({ owner: userId });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const cartItem = cart.items.find(
      (item) => item.productId.toString() === productId
    );

    if (!cartItem) {
      return res
        .status(404)
        .json({ success: false, message: "Cart item not found" });
    }
    const product = await productModel.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Ensure that the quantity doesn't go below 1
    if (req.body.need === "sub" && cartItem.quantity <= 1) {
      return res.status(200).json({
        success: true,
        quantity: cartItem.quantity,
        updatedPrice: cartItem.price,
        totalamt: cart.billTotal,
      });
    }

    cartItem.quantity =
      req.body.need === "sub" ? Math.max(1, cartItem.quantity - 1) : cartItem.quantity + 1;
    cartItem.price = cartItem.quantity * cartItem.productPrice || 0;

    cart.billTotal = req.body.need === "sub"
      ? Math.max(0, cart.billTotal - product.afterDiscount) // Ensure non-negative billTotal
      : cart.billTotal + product.afterDiscount;

    const quantity = cartItem.quantity;

    await cart.save();
    console.log(cart.billTotal);
    let totalamt = cart.billTotal;
    return res.status(200).json({ success: true, quantity, updatedPrice: cartItem.price, totalamt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};





const cartRemove = async (req, res) => {
  try {
    console.log(req.body);
    const productId = req.body.productId;
    const userId = req.body.userId;

    const cart = await cartModel.findOne({ owner: userId });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart Not Found" });
    }

    

    cart.items.find((item) => {
      if (item.productId + "" === productId + "") {
        cart.billTotal = (cart.billTotal - item.price < 0) ? 0 : cart.billTotal - item.price

        console.log(cart.billTotal);
        return true;
      } else {
        return false;
      }
    });

    await cartModel.findByIdAndUpdate(cart._id, {
      $set: { billTotal: cart.billTotal },
      $pull: { items: { productId: productId } },
    });

    return res
      .status(200)
      .json({ success: true, message: "Product removed from the cart" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};



const cartbillTotalUpdate = async (req, res) => {
  try {
    const selectedProductIds = req.body.selectedProductIds;

    // Find the user's cart
    const userId = req.session.email._id;
    const cart = await cartModel.findOne({ owner: userId });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart is not found based on user" });
    }

    // if(!selectedProducts){
    //     return res.status(404).json({success:false,message:'Selected products not found'})
    // }

    // Set 'selected' to true for all selected products
    cart.items.forEach((item) => {
      if (selectedProductIds.includes(item.productId.toString())) {
        item.selected = true;
      } else {
        item.selected = false; // Unselect other products
      }
    });

    let total = 0;
    cart.items.forEach((item) => {
      if (item.selected) {
        total += item.productPrice * item.quantity;
      }
    });
    // Update the cart's billTotal
    cart.billTotal = total;
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Successfully billtotal updated",
      billTotal: cart.billTotal,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

module.exports = {
  userCart,
  addToCart,
  cartPut,
  cartRemove,
  cartbillTotalUpdate,
};