const express = require('express');
const api = require("./routes/api");
const bodyParser = require("body-parser");

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/*const cors = require('cors');
app.use((req, res, next) => {
    console.log("check cors");
    res.header("Access-Control-Allow-Origin", "*")
    app.use(cors);
    next();
});*/

app.use("/swap", api);
app.use("/swapquotein", api);
app.use("/swapquote", api);
app.use("/approve", api);
app.use("/", api);

const port = process.env.PORT || 9001;
app.listen(port, () => {
    console.log(`Run on port ${port}`);
});