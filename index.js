let port = 3999,
	express = require('express'),
	app = express(),
	{
		MongoClient,
	} = require('mongodb'),
	mongodb_user = encodeURIComponent(process.env.mongodb_user || 'dev'),
	mongodb_pass = encodeURIComponent(process.env.mongodb_pass || 'dev'),
	mongoString = `mongodb://${mongodb_user}:${mongodb_pass}@127.0.0.1:27017/admin`,
	client = new MongoClient(mongoString),
	compression = require('compression'),
	cors = require('cors'),
	db

//Compress all the data before sending
app.use(compression({level: 9}))

//Add cross origin support
app.use(cors())


//Serve the frontend 
app.use(express.static('public'))


//Connect to the database
client.connect((err, database) => {
	if (!err && !!database) {

		//Start the app listening
		app.listen(port, () => {

			//Log that the server went up, and when
			console.log(`${appName} started on port: ${port} - Date: ${new Date()}`)
		})
	}
	else {
		console.trace(`Failed to start (could not connect to mongo) - Date: ${new Date()}`, err)
	}
})
