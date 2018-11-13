var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

var UserSchema = new Schema({
	'Pseudo' : String,
	'Password' : String
});

module.exports = mongoose.model('User', UserSchema);
