const http = require('http');
const url = require('url');
const fs = require('fs');

const {MongoClient} = require('mongodb');

const port = 8080;
const domain = 'http://localhost:8080';

let db;

const destinations = {};

destinations.upload = async (req, res) => {
	
	if (req.method !== 'POST') {
		
		res.statusCode = 405;
		res.setHeader('Content-type', 'text/plain');
		res.end('405 - Method Not Allowed');
		
		return;
		
	}
	
	let extension;
	
	if (req.headers['content-type'] === 'image/png') {
		
		extension = 'png';
		
	} else if (req.headers['content-type'] === 'image/jpeg') {
		
		extension = 'jpg';
		
	} else {
		
		res.statusCode = 400;
		res.setHeader('Content-type', 'text/plain');
		res.end('400 - Bad Request');
		
		return;
		
	}
	
	//placeholder
	const code = 'abc1234';
	
	const writeStream = fs.createWriteStream(`images/${code}.${extension}`);
	
	req.pipe(writeStream);
	
	req.on('end', () => {
		
		res.statusCode = 200;
		res.setHeader('Content-type', 'text/plain');
		res.end(`${domain}/${code}`);
		
	});
	
};

const view = async (req, res, code) => {
	
	if (req.method !== 'GET') {
		
		res.statusCode = 405;
		res.setHeader('Content-type', 'text/plain');
		res.end('405 - Method Not Allowed');
		
		return;
		
	}
	
	if (!code.match(/^[0-9a-zA-Z]+$/)) {
		
		res.statusCode = 400;
		res.setHeader('Content-type', 'text/plain');
		res.end('400 - Bad Request');
		
		return;
		
	}
	
	//placeholder
	const extension = 'png';
	
	const readStream = fs.createReadStream(`images/${code}.${extension}`);
	
	res.statusCode = 200;
	res.setHeader('Content-type', extension === 'png' ? 'image/png' : 'image/jpeg');
	readStream.pipe(res);
	
	readStream.on('end', () => res.end());
	
};

const handleRequest = async (req, res) => {
	
	const parsedUrl = url.parse(req.url);
	const pathName = parsedUrl.pathname.substr(1);
	
	if (destinations.hasOwnProperty(pathName)) {
		
		await destinations[pathName](req, res);
		
	} else {
		
		await view(req, res, pathName);
		
	}
	
};

const init = async () => {
	
	const client = new MongoClient('mongodb://localhost:27017', {
		useUnifiedTopology: true
	});
	
	await client.connect();
	
	if (!client.isConnected()) {
		
		console.error('Could not connect to mongodb');
		
		process.exit(1);
		
	}
	
	db = client.db('img_upl');
	
	const server = http.createServer(handleRequest);
	
	server.listen(port, '0.0.0.0');
	
};

init().catch(err => {
	
	console.error(err);
	
	process.exit(1);
	
});