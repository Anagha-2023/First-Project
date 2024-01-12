const express = require("express");
const router = express.Router();
const session = require("express-session");
const adminModel = require("../models/Admin");
const admin = require("../routes/admin")
const UserModel = require("../models/User");
const mongoose = require("mongoose");
const nocache = require('nocache')



let admiN;

const adminlogin = (req, res) => {
  if (req.session.isAdmin) {
    return res.redirect("/admin");
  } else {
    res.render("adminLogin");
  }
};

const adminpost = async (req, res) => {
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

const adminhome = (req, res) => {
  res.render("adminHome", { admiN });
};

const adminusers = async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Get the requested page from query parameters
  const limit = 5; // Number of users per page

  try {
    const totalUsers = await UserModel.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);

    const users = await UserModel.find()
      .skip((page - 1) * limit)
      .limit(limit);

    res.render("usersList", {
      users,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Internal Server Error");
  }
};


const blockuser = async (req, res) => {
  try {
    const { id } = req.body;
    const user = await UserModel.findById(id);

    if (user) {
      // Toggle the block status
      user.isBlocked = !user.isBlocked;
      await user.save();

      // Update the block status in the session if the user is logged in
      if (req.session && req.session.user) {
        req.session.user.isBlocked = user.isBlocked;
      }

      res.status(200).json({
        status: true,
        isBlocked: user.isBlocked,
      });
    } else {
      res.status(404).json({
        status: false,
        message: 'User not found',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
    });
  }
};


const userdelete = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await UserModel.findByIdAndDelete(userId);

    if (!user) {
      res.status(404).send("User not found");
    } else {
      req.session.user = false;
      res.send("User deleted successfully");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while deleting the user");
  }
};

const useradd = (req, res) => {
  res.render("adminAdduser");
};

const adminlogout = (req, res) => {
  console.log("hello logout ");

  req.session.isAdmin = false;
  res.render('adminLogin')

};

const useraddpost = (req, res) => {
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

const userupdate = async (req, res) => {
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

const updatepost = async (req, res) => {
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

const usersearch = async (req, res) => {
  try {
    const { search } = req.query; // Assuming the user name is in the query string

    if (!search || typeof search !== 'string') {
      return res.status(400).json({ message: "Invalid user name" });
    }

    const page = parseInt(req.query.page) || 1; // Get the requested page from query parameters
    const limit = 5; // Number of users per page

    const regex = new RegExp(search, 'i'); // Case-insensitive substring search in the name

    const totalUsers = await UserModel.countDocuments({ name: regex });
    const totalPages = Math.ceil(totalUsers / limit);

    const users = await UserModel.find({ name: regex })
      .skip((page - 1) * limit)
      .limit(limit);

    res.render("usersList", {
      users,
      currentPage: page,
      totalPages,
      search,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};







const logout = (req, res) => {
  res.render('adminLogin')
}

module.exports = {
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
  blockuser,
  logout,
}