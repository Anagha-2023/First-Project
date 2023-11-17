const express = require("express");
const router = express.Router();
const session = require("express-session");
const adminModel = require("../models/Admin");
const admin=require("../routes/admin")
const UserModel = require("../models/User");
const mongoose = require("mongoose");
const nocache = require('nocache')



let admiN;

const adminlogin=(req, res) => {
  if (req.session.isAdmin) {
    return res.redirect("/admin");
  } else {
    res.render("adminLogin");
  }
};

const adminpost=async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log(adminModel);

    const admin = await adminModel.findOne({ email, password });

    console.log(admin);

    if (admin) {
      admiN = admin.name;
      req.session.isAdmin = true;
      console.log(admiN);
      res.status(200);
      res.redirect("/admin");
    } else {
      res.render("adminLogin", {
        errorMessage: "Invalid admin credentials",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const adminhome=(req, res) => {
  res.render("adminHome", { admiN });
};

const adminusers=async (req, res) => {
  const users = await UserModel.find();
  res.render("usersList", { users });
};

const blockuser=async(req,res)=>{
  let { id } = req.body;
  const users = await UserModel.findById(id);
  if(users){
      if(users.isBlocked === true) {
          users.isBlocked = false;
          users.save();
          res.status(200).json({
            status: true
          });
      }else if (users.isBlocked === false) {
          users.isBlocked = true;
          users.save();
          res.status(201).json({
            status: true
          });
  }
}else{
  res.status(402).json({
      status: true
    });
}
};

const userdelete=async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await UserModel.findByIdAndDelete(userId);

    if (!user) {
      res.status(404).send("User not found");
    } else {
      req.session.user=false;
      res.send("User deleted successfully");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while deleting the user");
  }
};

const useradd=(req, res) => {
  res.render("adminAdduser");
};

const adminlogout=(req, res) => {
  console.log("hello logout ");

    req.session.isAdmin=false;
    res.render('adminLogin')

};

const useraddpost=(req, res) => {
  const { username, email, password } = req.body;

  // Check if the user already exists in the database
  UserModel.findOne({ email: email })
    .then((foundUser) => {
      if (foundUser) {
        res.render("adminAdduser", {
          errorMessage: "User already exists. Please See in your list.",
        });
      } else {
        const newUser = new UserModel({
          name: username,
          email: email,
          password: password,
        });

        newUser
          .save()
          .then(() => {
            res.send(
              '<script> window.location.href = "/admin/users"; alert("New User added successfully."); </script>'
            );
            return;
          })
          .catch((err) => {
            console.error(err);
            res.send(
              '<script>alert("Error occurred while registering the user."); window.location.href = "/users";</script>'
            );
  
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.send(
        '<script>alert("Error occurred while checking user existence."); window.location.href = "/signup";</script>'
      );
    });
};

const userupdate=async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Render the EJS template for editing user details
    res.render("adminEdituser", { user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updatepost=async (req, res) => {
  try {
    const userId = req.params.userId;

    const updatedUserDetails = req.body;
    console.log("herer updated");

    const user = await UserModel.findByIdAndUpdate(userId, updatedUserDetails, {
      new: true,
    });
    if (!user) {
      res.send(
        '<script> window.location.href = "/admin/users"; alert("User is Not Found or something error occurs."); </script>'
      );
      return;
    }
  
    res.send(
      '<script> window.location.href = "/admin/users"; alert("User Details are updated successfully."); </script>'
    );
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const usersearch=async (req, res) => {
  try {
    const { searchTerm } = req.body;
    console.log(searchTerm);
    // Perform the user search based on the searchTerm
    const Users = await UserModel.find({
      $or: [
        { name: { $regex: searchTerm, $options: "i" } }, // Case-insensitive name search
        { email: { $regex: searchTerm, $options: "i" } }, // Case-insensitive email search
      ],
    });
    
    // Render a page with the search results
    res.render("adminUserSearch", { Users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};


module.exports={
  adminlogin,
  adminpost,
  adminhome,
  adminlogout,
  adminusers,
  userdelete,
  useradd,
  useraddpost,
  userupdate,
  updatepost,
  usersearch,
  blockuser
}