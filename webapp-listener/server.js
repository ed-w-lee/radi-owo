const path = require("path");
const express = require("express");
const app = require("./public/build/App.js");

const server = express();

server.use(express.static(path.join(__dirname, 'public')));

server.get(["/", "/*"], function (req, res) {
  console.log(`${req.ip} --> ${req.url}`);
  if (req.url === '/') {
    res.redirect('/home');
    return;
  }

  const { html } = app.render({ url: req.url });

  res.write(`
<!DOCTYPE html>
<html lang="en">

<head>
	<meta charset='utf-8'>
	<meta name='viewport' content='width=device-width,initial-scale=1'>

	<title>RadioWo</title>

	<link rel='icon' type='image/png' href='/favicon.png'>
	<link rel='stylesheet' href='/global.css'>
	<link rel='stylesheet' href='/build/bundle.css'>

	<script defer src='/build/bundle.js'></script>
</head>

<body>
  <div id="app">${html}</div>
</body>

</html>
  `);

  res.end();
});

const port = 5000;
server.listen(port, () => console.log(`Listening on port ${port}`));