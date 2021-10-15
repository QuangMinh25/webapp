var mongoose = require("mongoose");

var adminSchema =  new mongoose.Schema({
	
	uid: String,
    token: String,
    email: String,
    name: String,
    gender: String,
    pic: String
	
});
var Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;