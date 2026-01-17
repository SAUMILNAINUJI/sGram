const mongoose = require('mongoose');



const userSchema = new mongoose.Schema({

    username: String,
    email: String,
    password: String,
    profilepic: {
        type: String,
        default: 'default.png'
    },
    isPremium: {
        type: Boolean,
        default: false

    }

});
module.exports = mongoose.model('user', userSchema);
