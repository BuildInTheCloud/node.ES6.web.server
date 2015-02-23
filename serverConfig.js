exports.config = {

	default: {
		cacheBuster: false,
		port: 80,
		cluster: 1,
		listeners: 10,
		gzip: true,
		ssl: false,
		nocache: true,
		compress: false,
		dev: true,
		default: [
		]
	},

	combind: {
		jsFiles: [
		],
		cssFiles: [
		]
	}

};