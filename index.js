const express = require('express')
const connectDB = require('./config/db')
const app = express()
app.use(express.json())
//facebook login admin

const facebookStrategy = require('passport-facebook').Strategy
const passport = require('passport')
const session = require('express-session')
app.use(session({ secret: 'buiquangminh' }));
app.use(passport.initialize());
    app.use(passport.session()); 

passport.use(new facebookStrategy({

    // pull in our app id and secret from our auth.js file
    clientID        : "205705758326305",
    clientSecret    : "6263a8cff805791f8e802c7a0502915e",
    callbackURL     : "http://localhost:3000/facebook/callback",
    profileFields: ['id', 'displayName', 'name', 'gender', 'picture.type(large)','email']

},// facebook will send back the token and profile
function(token, refreshToken, profile, done) {

    // asynchronous
    process.nextTick(function() {

        // find the user in the database based on their facebook id
        Admin.findOne({ 'uid' : profile.id }, function(err, admin) {

            // if there is an error, stop everything and return that
            // ie an error connecting to the database
            if (err)
                return done(err);

            // if the user is found, then log them in
            if (admin) {
                console.log("user found")
                console.log(admin)
                return done(null, admin); // user found, return that user
            } else {
                // if there is no user found with that facebook id, create them
                var newAdmin  = new Admin();

                // set all of the facebook information in our user model
                newAdmin.uid    = profile.id; // set the users facebook id                   
                newAdmin.token = token; // we will save the token that facebook provides to the user                    
                newAdmin.name  = profile.name.givenName + ' ' + profile.name.familyName; // look at the passport user profile to see how names are returned
                newAdmin.email = profile.emails[0].value; // facebook can return multiple emails so we'll take the first
                newAdmin.gender = profile.gender
                newAdmin.pic = profile.photos[0].value
                // save our user to the database
                newAdmin.save(function(err) {
                    if (err)
                        throw err;

                    // if successful, return the new user
                    return done(null, newAdmin);
                });
            }

        });

    })

}));

passport.serializeUser(function(admin, done) {
    done(null, admin.id);
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
    Admin.findById(id, function(err, admin) {
        done(err, admin);
    });
});

module.exports.recoveryPass = async function (req, res) {
    User.find({}, function(err, users) {
        res.render('admin', {
            userList: users
        })
    })
}


//route middleware to make sure
function isLoggedIn(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	// if they aren't redirect them to the home page
	res.redirect('/home');
}

app.get('/auth/facebook/', passport.authenticate('facebook', { scope : 'email' }));

app.get('/facebook/callback',
		passport.authenticate('facebook', {
			successRedirect : 'user/recoverypassword',
			failureRedirect : '/'
		}));

app.get('/user/admin',(req,res) => {
    res.render("loginadmin")
})
//////////////////////////////////
app.set('view engine', 'ejs');
app.set('views', './views');
var bodyParser = require('body-parser');
app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({extended: true})) // for parsing application/x-www-form-urlencoded
app.use('/public', express.static('public'));

var cookieParser = require('cookie-parser')
app.use(cookieParser());

var validateAuth = require("./validateAuth/validateLogin"); //Kiem tra cookie user da dang nhap

var homeRouter = require("./routers/home.router");
app.use("/home", validateAuth, homeRouter);

// Kết nối tới server
var server = require("http").Server(app);
var io = require("socket.io")(server);
// var controller = require("./controller/home.controller");
io.on("connection", socketIOFunction);

var userRouter = require("./routers/user.router");
app.use("/user", userRouter);

var apiRouter = require("./api/home.api");
app.use("/api", validateAuth, apiRouter);

//admin

//ket noi database
connectDB()

const port = 3000
//ket noi server socketio va database
server.listen(port,() => console.log(`Minh Đang mở công tại http://localhost:${port}`))

var User = require("./model/user.model");
var Friend = require("./model/friend.model");
//
var Admin = require("./model/admin.model");

function socketIOFunction(socket) {
    socket.on("disconnect", function () {
        console.log("Ngat ket noi voi id: " + socket.id);
    })
    socket.on("Gui-id-user-len-server", async function (idUserHienTai) {
        console.log("Id cua user dang truy cap: " + idUserHienTai);
        var thongTinUserHienTai = await User.findOne({_id: idUserHienTai});
        var allUser = await User.find().select({
            "username": 1,
            "_id": 1,
            "gmail": 1,
            "avatar": 1,
            "friend": 1,
            "information": 1
        });
        socket.accountUser = thongTinUserHienTai;
        socket.allUser = allUser;
        //Join ID user hiện tại vào room các friend
        // 1. Xác định được ID của document trong DB chứa ID User đang trung cập và ID Friend
        // 2. Join id hiện tại vào trong room có tên là ID document chứa ID hiện tại và ID Friend
        var arrTinNhanTatCaUser = await Friend.find();

        // Tìm kiếm các document chưa id hiện tại và id friend
        // 1. Lọc tất cả các document có trong collection Friend. So sánh id1 của từng document. id1 nào trùng với id của user hiện tại thì ta lọc qua tât cả các id friend của user hiện tại. Nếu id2 trùng với id friend thì ta push vào mảng trống idArrFriend một document chứa id user hiện tại và id friend

        var idArrFriend = timArrayIdFriend(idUserHienTai, arrTinNhanTatCaUser);
        // 2. Join socket hiện tại vào room có tên là id của các document đã lọc được chứa id của user hiện tại và id friend của user đó
        socket.idArrFriend = idArrFriend;
        idArrFriend.forEach(function (capFriend) {
            socket.join(capFriend.toString());
        })

    })
    socket.on("client-gui-id-friend-len-server", async function (dataIdFriend) {
        // Xac dinh room cua id friend cua nhan duoc
        // Send mess vao room do
        var arrTinNhanTatCaUser = await Friend.find();
        // Tìm kiếm các document chưa id hiện tại và id friend
        // 1. Lọc tất cả các document có trong collection Friend. So sánh id1 của từng document. id1 nào trùng với id của user hiện tại thì ta lọc qua tât cả các id friend của user hiện tại. Nếu id2 trùng với id friend thì ta push vào mảng trống idArrFriend một document chứa id user hiện tại và id friend

        var idCapFriend = timIdCapFriend (dataIdFriend, socket.accountUser._id, arrTinNhanTatCaUser)

        if (idCapFriend){
            arrTinNhanTatCaUser.forEach(capFriend =>{
                if(capFriend._id == idCapFriend ){
                    socket.emit("server-gui-tin-nhan-friend-ve-client", capFriend.mess);
                }
            })
        }

    });
    socket.on("Gui-noi-dung-tin-nhan-len-server", async function (data) {
        var arrTinNhanTatCaUser = await Friend.find();
        var idCapFriend = timIdCapFriend (data.idFriend, data.elementMess.idAb , arrTinNhanTatCaUser);
        var capFriend = await Friend.findOne({_id: idCapFriend});
        capFriend.mess.push(data.elementMess);
        capFriend.save();
        io.sockets.in(idCapFriend.toString()).emit("server-gui-tin-nhan-ve-cac-room-trong-client",
            {
                idfriend:data.idFriend,
                idUser:data.elementMess.idAb,
                data: capFriend.mess
            });
    })

}

// Tạo một hàm truyền vào ba tham số: 1 id của user hiện tại, 1 id của friend, 1 array
// Tìm ra id của phần tử trong array chứa hai tham số id đã truyền vào. Return về id đó.
function timIdCapFriend (id1, id2, array){
    var idCapFriend;
    array.forEach(item =>{
        if((item.id1 == id1) && (item.id2 == id2)){
            idCapFriend = item._id;
            return
        };
        if((item.id1 == id2) && (item.id2 == id1)){
            idCapFriend = item._id;
            return
        }
    })
    return idCapFriend;
}

// Tạo một function truyền vào 2 tham số: 1 là id của user, 2 là array
// Tìm ra tìm ra các phần tử trong array chưa id 1. Gán các id của phần tử đó vào một mảng

function timArrayIdFriend( id, arr){
    var arrayFriend = [];
    arr.forEach(item =>{
        if((item.id1 == id ) || (item.id2 == id )){
            arrayFriend.push(item._id);
        }
    })
    return arrayFriend;
}
