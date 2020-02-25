const http = require('http');

const port = 8080;

const handleRequest = async (req, res) => {
	
};

const server = http.createServer(handleRequest);

server.listen(port, '0.0.0.0');