var express = require('express')
var router = express.Router();
var controller = require("../controller/user.controller");
var validateAuth = require("../validateAuth/validateLogin");

router.get("/dangky", controller.dangky);
router.post('/dangky', controller.luuDuLieu);

router.get("/dangnhap", controller.dangnhap);
router.post("/dangnhap", controller.postDangnhap);

//admin dashboard
router.get("/recoverypassword", controller.recoveryPass);
//admin
router.get("/admin", controller.admin);
router.post("/admin", controller.postadmin);
module.exports = router;
