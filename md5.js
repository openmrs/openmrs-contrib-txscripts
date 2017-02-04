var md5 = require("md5");

var raw = [process.argv[2], ""].join(":");
console.log(raw);
console.log(md5(raw));