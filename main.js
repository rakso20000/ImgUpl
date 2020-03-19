const http = require('http');
const url = require('url');
const fs = require('fs');

const {MongoClient} = require('mongodb');

const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const codeLength = 5;
const port = 25235;
const domain = 'https://img.rakso.me';

let mongoUsers;
let mongoImages;

let listHTML;

let listImgElem;

const destinations = {};

destinations.upload = async (req, res) => {
	
	const user = await mongoUsers.findOne({
		apiKey: req.headers['x-api-key']
	});
	
	if (user === null) {
		
		res.statusCode = 401;
		res.setHeader('Content-type', 'text/plain');
		res.end('401 - Unauthorized');
		
		return;
		
	}
	
	if (req.method !== 'POST') {
		
		res.statusCode = 405;
		res.setHeader('Content-type', 'text/plain');
		res.end('405 - Method Not Allowed');
		
		return;
		
	}
	
	try {
		
		await fs.promises.access('images');
		
	} catch (err) {
		
		if (err.code === 'ENOENT')
			fs.promises.mkdir('images');
		
	}
	
	const type = req.headers['content-type'];
	
	let extension;
	
	if (type === 'image/png') {
		
		extension = 'png';
		
	} else if (type === 'image/jpeg') {
		
		extension = 'jpg';
		
	} else {
		
		res.statusCode = 400;
		res.setHeader('Content-type', 'text/plain');
		res.end('400 - Bad Request');
		
		return;
		
	}
	
	let code = '';
	
	while (code === '') {
		
		for (let i = 0; i < codeLength; i++)
			code += chars.charAt(Math.floor(Math.random() * chars.length));
		
		const img = await mongoImages.findOne({
			code
		});
		
		if (img !== null)
			code = '';
		
	}
	
	const writeStream = fs.createWriteStream(`images/${code}.${extension}`);
	
	let errorOccured = false;
	
	writeStream.on('error', err => {
		
		console.error(err);
		
		errorOccured = true;
		
	});
	
	req.pipe(writeStream);
	
	await new Promise(resolve => req.on('end', resolve));
	
	writeStream.end();
	
	if (!errorOccured)
		await new Promise(resolve => {
			
			writeStream.on('error', resolve);
			writeStream.on('finish', resolve);
			
		});
	
	if (errorOccured) {
		
		res.statusCode = 500;
		res.setHeader('Content-type', 'text/plain');
		res.end('500 - Internal Server Error');
		
		return;
		
	}
	
	await mongoImages.insertOne({
		code,
		type,
		author: user.id,
		timestamp: Date.now()
	});
	
	console.log(`User ${user.id} uploaded ${code}.${extension}`);
	
	res.statusCode = 200;
	res.setHeader('Content-type', 'text/plain');
	res.end(`${domain}/${code}`);
	
};

destinations.list = async (req, res) => {
	
	if (req.method !== 'GET') {
		
		res.statusCode = 405;
		res.setHeader('Content-type', 'text/plain');
		res.end('405 - Method Not Allowed');
		
		return;
		
	}
	
	const imagesCursor = mongoImages.find();
	
	imagesCursor.sort({
		timestamp: -1
	});
	
	let imagesStr = '';
	
	await new Promise(resolve => imagesCursor.forEach(({code}) => {
		
		imagesStr += listImgElem.replace(/%code%/g, code);
		
	}, resolve));
	
	res.statusCode = 200;
	res.setHeader('Content-type', 'text/html');
	res.end(listHTML.replace('%images%', imagesStr));
	
};

const view = async (req, res, code) => {
	
	if (req.method !== 'GET') {
		
		res.statusCode = 405;
		res.setHeader('Content-type', 'text/plain');
		res.end('405 - Method Not Allowed');
		
		return;
		
	}
	
	if (!code.match(/^[0-9a-zA-Z]+$/)) {
		
		res.statusCode = 404;
		res.setHeader('Content-type', 'text/plain');
		res.end('404 - Not Found');
		
		return;
		
	}
	
	const img = await mongoImages.findOne({
		code
	});
	
	if (img === null) {
		
		res.statusCode = 404;
		res.setHeader('Content-type', 'text/plain');
		res.end('404 - Not Found');
		
		return;
		
	}
	
	const extension = img.type === 'image/png' ? 'png' : 'jpg';
	
	const readStream = fs.createReadStream(`images/${code}.${extension}`);
	
	res.statusCode = 200;
	res.setHeader('Content-type', img.type);
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
	
	try {
		
		const listHTMLP = fs.promises.readFile('html/list.html', 'utf8');
		
		const listImgElemP = fs.promises.readFile('elems/list.img.elem', 'utf8');
		
		[listHTML, listImgElem] = await Promise.all([listHTMLP, listImgElemP]);
		
	} catch (err) {
		
		console.error('Error reading files:');
		console.error(err);
		
		process.exit(1);
		
	}
	
	listImgElem = listImgElem.replace('%domain%', domain);
	
	const client = new MongoClient('mongodb://localhost:27017', {
		useUnifiedTopology: true
	});
	
	await client.connect();
	
	if (!client.isConnected()) {
		
		console.error('Could not connect to mongodb');
		
		process.exit(1);
		
	}
	
	const db = client.db('imgupl');
	
	mongoUsers = db.collection('users');
	mongoImages = db.collection('images');
	
	console.log('Loaded mongodb');
	
	const server = http.createServer(handleRequest);
	
	server.listen(port, '0.0.0.0');
	
	console.log(`Listening on port ${port}`);
	
};

init().catch(err => {
	
	console.error(err);
	
	process.exit(1);
	
});