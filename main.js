const http = require('http');
const url = require('url');

const port = 8080;

const destinations = {};

destinations.upload = async (req, res) => {
	
};

const handleRequest = async (req, res) => {
	
	const parsedUrl = url.parse(req.url);
	const pathName = parsedUrl.pathname;
	
	if (destinations.hasOwnProperty(pathName)) {
		
		await destinations[pathName](req, res);
		
	} else {
		
		
		
	}
	
};

const server = http.createServer(handleRequest);

server.listen(port, '0.0.0.0');