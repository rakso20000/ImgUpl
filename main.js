const http = require('http');
const url = require('url');
const fs = require('fs');

const port = 8080;

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
	
};

const handleRequest = async (req, res) => {
	
	const parsedUrl = url.parse(req.url);
	const pathName = parsedUrl.pathname;
	
	if (destinations.hasOwnProperty(pathName)) {
		
		await destinations[pathName](req, res);
		
	} else {
		
		await view(req, res, pathName);
		
	}
	
};

const server = http.createServer(handleRequest);

server.listen(port, '0.0.0.0');