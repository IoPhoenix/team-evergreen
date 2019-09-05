//users.js
//Author - Fil - August 28, 2019
//Inspiration - https://blog.bitsrc.io/build-a-login-auth-app-with-mern-stack-part-1-c405048e3669

// Core packages to enable routing functionality
const express = require("express");
const router = express.Router();

// Loads .env keys depending on environment in use
const keys = require("../../config/config");

// Used to encrypt/decrypt password and for using jwt token
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Used to load files
const Busboy = require("busboy");
const fileUpload = require("express-fileupload");
router.use(fileUpload());

// Load utility functions
const uploadToS3 = require("../utils/s3Upload");

// Load input validation
const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");
const validateFriendListInput = require("../../validation/friendList");

// Load User model
const User = require("../../models/User");
const FriendList = require("../../models/FriendList");

router.put("/:user_id", (req, res) => {
    const user_id = req.params.user_id;
    const file = req.files.avatar;
    User.findById(user_id).then(user => {
        if (!user) {
            return res.status(400).json({ email: "User does not exist" });
        } else {
            if (file) {
                if (req.body.name) user.name = req.body.name;
                var busboy = new Busboy({ headers: req.headers });
                busboy.on("finish", function() {
                    uploadToS3(file, user, "avatar", res);
                });
                req.pipe(busboy);
            }
        }
    });
});

// @route POST api/users/register
// @desc Register user
// @access Public

router.post("/register", (req, res) => {
    // Form validation
    const { errors, isValid } = validateRegisterInput(req.body);

    // Check validation
    if (!isValid) {
        return res.status(400).json(errors);
    }
    User.findOne({ email: req.body.email }).then(user => {
        if (user) {
            return res.status(400).json({ email: "Email already exists" });
        } else {
            const newUser = new User({
                name: req.body.name,
                email: req.body.email,
                password: req.body.password
            });
            // Hash password before saving in database
            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(newUser.password, salt, (err, hash) => {
                    if (err) throw err;
                    newUser.password = hash;
                    newUser
                        .save()
                        .then(user => createToken(user, res))
                        .catch(err => console.log(err));
                });
            });
        }
    });
});

// @route POST api/users/login
// @desc Login user and return JWT token
// @access Public
router.post("/login", (req, res) => {
    // Form validation
    const { errors, isValid } = validateLoginInput(req.body);

    // Check validation
    if (!isValid) {
        return res.status(400).json(errors);
    }
    const email = req.body.email;
    const password = req.body.password;

    // Find user by email
    User.findOne({ email }).then(user => {
        // Check if user exists
        if (!user) {
            return res.status(404).json({ emailnotfound: "Email not found" });
        }

        // Check password
        bcrypt
            .compare(password, user.password)
            .then(isMatch => {
                if (isMatch) {
                    // User matched
                    // Create JWT token and return via res.json
                    createToken(user, res);
                } else {
                    return res
                        .status(400)
                        .json({ password: "Password incorrect" });
                }
            })
            .catch();
    });
});

// @desc Creates a JWT token and returns via callback function provided
// @access Private
function createToken(user, res) {
    // Create JWT Payload
    const payload = {
        id: user.id,
        name: user.name
    };

    // Sign token
    jwt.sign(
        payload,
        keys.app.secretOrKey,
        {
            expiresIn: 31556926 // 1 year in seconds
        },
        (err, token) => {
            if (!err) {
                res.json({
                    status: 200,
                    token: `Bearer ${token}`
                });
            } else {
                res.json({
                    status: 500,
                    error: "Unable to generate token."
                });
            }
        }
    );
}

router.post("/add_friend_list", (req, res) => {
    const { userId, title, friends } = req.body;
    const { errors, isValid } = validateFriendListInput(req.body);

    // validate request info:
    if (!isValid) {
        return res.status(400).json(errors);
    }

    FriendList.findOne({ title: title }).then(list => {
        if (list) {
            return res
                .status(400)
                .json({ error: "List with this title already exists" });
        } else {
            const newList = new FriendList({
                userId: userId,
                title: title,
                friends: friends
            });

            // save new list and add its id to relevant User
            newList
                .save()
                .then(list => {
                    res.json(list);
                })
                .catch(err => console.log(err));
        }
    });
});

module.exports = router;
