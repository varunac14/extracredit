var crypto = require('crypto');
var fs = require('fs');
var express = require('express');
var Client = require('node-rest-client').Client;
var client = new Client();
var http = require('http');
var path = require('path');
var dt = {};
var app = express();
var server = http.createServer(app);

var app = express();
app.use(express.bodyParser());
//app.use(require('connect-multiparty')())
//app.use(express.json());
//app.use(express.urlencoded());
app.use("/images", express.static(__dirname + '/images'));

handlebars  = require('express3-handlebars');
hbs = handlebars.create();
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'
 
    // development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var DB = require('mongodb').Db,
DB_Connection = require('mongodb').Connection,
DB_Server = require('mongodb').Server,
async = require('async');


var db_host = "ds049150.mongolab.com";
var db_port = "49150";
var db_user = "cmpe281lab3";
var db_pwd = "cmpe281";
var db_name = "cmpe281lab3";

var db = new DB(db_name,
                new DB_Server(db_host, db_port,
						{ auto_reconnect: true,
						poolSize: 20}),
						{w: 1} );


						
db_init = function (callback) {
      //console.log("Hello .. this is init");
  
	async.waterfall([
	//1.open database
	function(cb){
		console.log("INIT: Step 1. Open MongoDB...");
		db.open(cb);
		},

		// 2. authenticate
		function (result, cb) {
		console.log("INIT: Step 2.Authenticate...");
		db.authenticate(db_user,db_pwd, function(err,res){
					if(!err){
					console.log("Authenticated");
					cb(null, callback);
					} 
                    else 
                    {
						console.log("Error in authentication");
						console.log(err);
						process.exit(-1);
					}
				});
			},
			// fetch collections
			function (result, cb) {
				console.log("INIT: Step 3. Fetch Collections...");
				db.collections(cb);
			},
			], callback);
		};


function get_hash(state,ts)
{
    var secret_key = "AC6CB6D2FB1C3729C7114E5225DF7";
    text = state + "|" + ts + "|" + secret_key;
    hmac = crypto.createHmac("sha256",secret_key);
    hmac.setEncoding('base64');
    hmac.write(text);
    hmac.end();
    hash=hmac.read();
    return hash;
}


var page = function(req,res,state,ts){
        //console.log("Hello .. this is page");
        db.collection('gumball',function(err,collection){
            if (err) {
                console.log("ERROR" + err) ;
            }
        
            collection.find({serialNumber:'1234998871109'}).toArray(function(err,results){
            
            var data = results[0];
            var rec_id=data._id;
            console.log("fetched id:" + rec_id);
            var result = new Object();
            hash = get_hash(state,ts);
            console.log(state);
            console.log(data);
            count = data.countGumballs
            console.log("count=" + count);
            var msg = "\n\nMighty Gumball,Inc.\n\nNodeJS-Enabled Standing Gumball\nModel#" + 
                    data.modelNumber + "\n" + 
                    "Serial#" + data.serialNumber + "\n" +
                    "\n" + state +"\n\n";
                
            result.msg = msg;
            result.ts = ts;
            result.hash = hash;
            result.state = state;
                       
            res.render('gumball' ,{
                state:result.state,
                ts:result.ts,
                hash:result.hash,
                message:result.msg
                
            });
        });
    });
}



var error = function(req,res,state,ts){
        console.log("Hello .. this is error");
        db.collection('gumball',function(err,collection){
            if (err) {
                console.log("ERROR" + err) ;
            }
        
            collection.find({serialNumber:'1234998871109'}).toArray(function(err,results){
            
            var data = results[0];
            var rec_id=data._id;
            console.log("fetched id:" + rec_id);
            var result = new Object();
            hash = get_hash(state,ts);
            console.log(state);
            console.log(data);
            count = data.countGumballs
            console.log("count=" + count);
            var msg = "\n\nMighty Gumball,Inc.\n\nNodeJS-Enabled Standing Gumball\nModel#" + 
                    data.modelNumber + "\n" + 
                    "Serial#" + data.serialNumber + "\n" +
                    "\n" + state +"\n\n";
                
            result.msg = msg;
            result.ts = ts;
            result.hash = hash;
            result.state = state;
                       
            res.render('gumball' ,{
                state:result.state,
                ts:result.ts,
                hash:result.hash,
                message:result.msg
                
            });
        });
    });
}

var order = function( req, res, state, ts) {
  db.collection('gumball', function(err, collection){
  collection.find({serialNumber: '1234998871109'}).toArray(function(err, results){
		
		var data = results[0];
		var rec_id = data._id;
		console.log("updating rec id: " + rec_id);
		
		count = data.countGumballs;
		if (count > 0) {
			count--;
			collection.update({_id: rec_id}, {$set: {countGumballs: count}}, function(err,results){
					console.log("count after = " + count );
					page(req, res, state, ts);
					}
				);
			}
			else{
				error(req, res, "*** Out Of Inventory ***",ts);
			}
			
		});
		
	});
	
}


var handle_post = function (req, res, next) {
    console.log( "Post: " + "Action: " +  req.body.event + " State: " + req.body.state + "\n" ) ;
    var hash1 = "" + req.body.hash ;
    var state = "" + req.body.state ;
    var action = "" + req.body.event ;
    var ts = parseInt(req.body.ts) ;
    var now = new Date().getTime() ;
    var diff = ((now - ts)/1000) ;
    hash2 = get_hash ( state, ts ) ;
    console.log( "DIFF:  " +  diff ) ;
    console.log( "HASH1: " + hash1 ) ;
    console.log( "HASH2: " + hash2 ) ;

    if ( diff > 120 /*|| hash1 != hash2*/ ) {
        error( req, res, "*** SESSION INVALID ***", ts ) ;
    }
    else if ( action == "Insert Quarter" ) {
        if ( state == "no-coin" )
            page( req, res, "has-coin", ts ) ;
        else
            page( req, res, state, ts ) ;
            
    }
    else if ( action == "Turn Crank" ) {
        if ( state == "has-coin" ) {
            hash = get_hash ( "no-coin", ts ) ;
            order(req, res, "no-coin", ts ) ;
        }
        else
            page( req, res, state, ts ) ;
    }  
  
}

var handle_get = function (req, res, next) {
    console.log( "Get: ..." ) ;
    ts = new Date().getTime();
    console.log( ts );
    state = "no-coin" ;
    page( req, res, state, ts );
}


db_init() ;
app.get('/', handle_get ) ;
app.post('/', handle_post ) ;


app.listen(server_port, server_ip_address, function(){
      console.log("Listening on " + server_ip_address + ", server_port " + server_port)
    });
