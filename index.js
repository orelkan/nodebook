const express = require("express");
const morgan = require("morgan");

const app = express();
const port = process.env.PORT || "8000";

app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.status(200).send("Nodebook server");
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Listening to requests on http://localhost:${port}`);
});