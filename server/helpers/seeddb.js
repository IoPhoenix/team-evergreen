//seeddb.js

/**
 * @desc - Uses the applications routes to generate data
 */

//Make a connection to the database - by default this is to development
//To create for test set process.env.NODE_ENV='test'
require("../config/db-connect");
const mongoose = require("mongoose");

// Application modules  and other configuration items
// import { names } from "./startdata";
const startData = require("./startdata");
const names = startData.usernames;
const avatars = startData.avatars;
const pollImages = startData.pollImages;
const pollTitles = startData.pollTitles;
const listTitles = startData.listTitles;

const config = require("../config/config");
import jwt_decode from "jwt-decode";
import User from "../models/User";
import FriendList from "../models/friendList";
import Poll from "../models/Poll";

//Constants
const TARGET_AVATAR = "avatar_image";

//network connectivity
import axios from "axios";

async function seedDb() {
    //drop the database
    console.log(`!!WARNING!! Dropping database ${mongoose.connection.host}`);
    try {
        await mongoose.connection.dropDatabase();
        console.log("Database dropped");
        const userIds = await createUsers();
        await addAvatarImages(userIds);
        const friendsLists = await addFriendLists(userIds);
        await addPolls(userIds, friendsLists);
        await addVotes();
    } catch (err) {
        console.log(err);
    }
}

seedDb()
    .then(() => console.log("Seed data created."))
    .catch(err => console.log(err));
//PRIVATE FUNCTIONS

async function addVotes() {
    const results = await Poll.find().populate({
        path: "sendToList",
        populate: { path: "friends" }
    });

    Promise.all(results).then(res => console.log(res));
}

async function addPolls(userIds, friendsLists) {
    let createPollPromises = [];
    let addPollToUserPromises = [];
    let count = 0;
    let newPolls = {};
    userIds.forEach((id, i) => {
        const newPoll = new Poll({
            title: pollTitles[i],
            options: pollImages[i],
            userId: id,
            sendToList: friendsLists[id],
            votes: [0, 0]
        });
        const newPromise = newPoll.save();
        newPolls[id] = newPoll._id;
        createPollPromises.push(newPromise);
        const addPollToUser = User.findByIdAndUpdate(id, {
            $push: { polls: newPoll._id }
        });
        addPollToUserPromises.push(addPollToUser);
    });

    //Create Polls
    await Promise.all(createPollPromises)
        .then(results => (count = results.length))
        .catch(err => console.log("****ERROR ADDING POLLS\n", err));

    console.log(`${count} polls`);

    //Add polls to users

    await Promise.all(addPollToUserPromises)
        .then(results => (count = results.length))
        .catch(err => console.log("****ERROR ADDING POLL TO USERS\n", err));

    console.log(`${count} users updated with poll`);
}

async function addFriendLists(userIds) {
    let promises = [];
    let count = 0;
    let friendsLists = {};
    await userIds.forEach((id, i) => {
        // exclude current user since user cannot add himself to a friend list:
        const friendIds = userIds.filter(friendId => friendId !== id);
        const friends = [
            friendIds[[Math.floor(Math.random() * 9)]],
            friendIds[[Math.floor(Math.random() * 9)]],
            friendIds[[Math.floor(Math.random() * 9)]],
            friendIds[[Math.floor(Math.random() * 9)]]
        ];
        const newList = new FriendList({
            title: listTitles[i],
            friends: friends,
            userId: id
        });
        newList.save();
        const newPromise = User.findByIdAndUpdate(id, {
            lists: [newList._id]
        }).exec();
        promises.push(newPromise);
        friendsLists[id] = newList._id;
    });
    await Promise.all(promises)
        .then(results => (count = results.length))
        .catch(err => console.log("****ERROR ADDING FRIEND LISTS\n", err));

    console.log(`${count} friends lists created`);
    return friendsLists;
}

async function addAvatarImages(userIds) {
    const promises = [];
    let count = 0;
    userIds.forEach((id, i) => {
        const newPromise = User.findByIdAndUpdate(id, {
            avatar: avatars[i]
        }).exec();
        promises.push(newPromise);
    });
    await Promise.all(promises)
        .then(results => (count = results.length))
        .catch(err => console.log("****ERROR ADDING AVATARS\n", err));

    console.log(`${count} avatars added`);
}

async function createUsers() {
    const newUserIds = [];
    const promises = [];
    names.forEach(name => {
        let newUser = {
            name: name,
            email: `${name.split(" ")[0].toLowerCase()}@mail.com`,
            password: config.app.samplePassword,
            password2: config.app.samplePassword
        };

        const newPromise = axios.post(
            "http://localhost:3001/api/users/register",
            newUser
        );
        promises.push(newPromise);
    });
    await Promise.all(promises)
        .then(results => {
            results.forEach(result => {
                const { token } = result.data;
                const decoded = jwt_decode(token);
                newUserIds.push(decoded.id);
            });
        })
        .catch(err => console.log("********* ERROR *********", err));
    console.log(`Created ${newUserIds.length} user ids.`);
    return newUserIds;
}
