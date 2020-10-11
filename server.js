const express = require('express');
const path = require('path');
const proxy = require('http-proxy-middleware');
const helmet = require('helmet');
const cors = require('cors');
const RateLimiter = require('express-rate-limit');
const _debug = require('debug');

const port = process.env.PORT || 9000;
const app = express();

const debug = _debug('server.js'); 

debug('Setting up rate limit...');
//setup rate-limiter to stop being bombarded by a large set of requests and subsequently crashing
const limiter = new RateLimiter({
	windowMs: 15 * 60 * 1000, //15min
	max: 9000, //limit each IP to 9000 request per windowMs (1 request per second)
});

app.use(limiter); //app.use("/api/", limiter); //could have different number of limiters for different routes

debug('Setting up helmet...');
//use helmet for hsts and dnsPrefetchControl
const sixtyDaysInSeconds = 5184000;
app.use(
	helmet.hsts({
		maxAge: sixtyDaysInSeconds,
	})
);
app.use(
	helmet.dnsPrefetchControl({
		allow: true,
	})
);
//set "X-Frame-Options" to DENY to prevent clickjacking in frames
app.use(
	helmet.frameguard({
		action: 'deny',
	})
);

//disable x-powered-by header so that attacker does not use it to detect if it is node express server
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, './dist')));

debug('Setting up cors...');
//enable cors for GET and OPTIONS only
corsOptions = {
	origin: true, //enable CORS from anywhere
	methods: ['GET', 'OPTIONS'], //however only allow with GET and OPTIONS (preflight)
	credentials: true, //for HTTP session traffic to work
	maxAge: 3600, //limit to one hour at most
	preflightContinue: false,
	optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

debug('Setting up proxy...');
//proxy to back-end api calls
const proxyOptions = {

	//target: backendUri,
	//changeOrigin: true,
	//pathRewrite: {
	//	'^/api': '',
	//},
	//secure: false,


	//here we can do cookieDomainRewrite etc
	//cookieDomainRewrite: {
	//  "unchanged.domain": "unchanged.domain",
	//  "old.domain": "new.domain",
	//  "*": ""
	//}

	//cookiePathRewrite: {
	//  "/unchanged.path/": "/unchanged.path/",
	//  "/old.path/": "/new.path/",
	//  "*": ""
	//}
};

if (process.env.NODE_ENV === 'production') {
	//NODE_ENV
	app.set('trust proxy', 1); // trust first
	//proxy.secure = true;
}

//app.use('/api', proxy(proxyOptions));

debug('Serving static resources...');
//send the user to index html page inspite of the url
app.get('*', (req, res) => {
	res.sendFile(path.resolve(__dirname, './dist/index.html'));
});

app.listen(port);

debug('HTTP is listening on :' + port);

